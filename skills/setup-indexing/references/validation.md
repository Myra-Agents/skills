# Validation pipeline for the code index

Run these gates in order after installing `index.sh`. Each gate caught a real
bug when this system was first built — do not skip them because the install
"looks fine". Report results per gate in the final summary.

## Gate 1 — syntax + full run

```bash
bash -n index.sh
/bin/bash index.sh        # explicit /bin/bash: macOS ships 3.2, the target
./index.sh --check        # must be all-fresh right after generation
```

Pass: every member reports `✓`, runtime is seconds (not minutes), `--check`
exits 0. A member reported `✗ not cloned` is fine if that directory genuinely
isn't present.

## Gate 2 — edge-case sandbox

Pipefail + `grep` with no match killed the original script on empty repos,
truncated the index mid-write, AND left a header that made `--check` report
"fresh" — three compounding failures from one missing `|| true`. The sandbox
proves the current script survives the shapes that triggered it:

```bash
T=$(mktemp -d); cp index.sh "$T/"; cd "$T"
git init -q emptyrepo                                  # no commits at all
git init -q flatrepo && touch flatrepo/readme.txt \
  && git -C flatrepo add -A && git -C flatrepo -c user.email=t@t -c user.name=t commit -qm x
git init -q dashrepo && printf 'real_func() {\n:\n}\n' > dashrepo/-e.sh \
  && mkdir dashrepo/lib && printf 'good_func() {\n:\n}\n' > dashrepo/lib/good.sh \
  && git -C dashrepo add -A && git -C dashrepo -c user.email=t@t -c user.name=t commit -qm x
/bin/bash index.sh emptyrepo flatrepo dashrepo; echo "exit=$?"
sed -n '/## symbols/,$p' .claude/index/dashrepo.md     # both functions present?
/bin/bash index.sh --check emptyrepo flatrepo dashrepo
cd - >/dev/null && rm -rf "$T"
```

Pass: exit 0 everywhere, all members indexed (a failing member must not stop
the ones after it), dashrepo's symbols include `-e.sh:1:real_func() {` (a
dash-prefixed filename parsed as a grep option silently empties the whole
xargs batch — that's why the script uses `grep -e "$pat" --`).

Note: the sandbox repos are siblings of the *copied* script, so `member_dir`
resolves them; `root` will report "not cloned" in the sandbox (no `.git` at
$T) — expected.

## Gate 3 — recall check (the one that matters)

The index is worthless if greppable-by-name recall is low. Measure it instead
of assuming it:

1. WITHOUT using the index, explore the repo and pick **8 diverse real
   elements**: exported functions, non-exported top-level components/hooks,
   Rust/Go items, shell functions, a config or route file, and — critically —
   anything unusual the repo has (extensionless shebang executables, generated
   files, submodule code). Spread across subdirectories and languages.
2. For each, check that grepping ONLY the index locates it:
   `grep -n "<name>" .claude/index/<member>.md` → right path (+ line for symbols).
3. Threshold: **≥ 7/8**. A whole *category* missing (e.g. "no .mjs symbols at
   all", "extensionless scripts contribute zero symbols") is a fail even at
   7/8 — fix the pattern or add a pass, regenerate, re-measure.

When subagents are available, run this as one agent per member in parallel,
prompted to pick elements *before* reading the index (prevents cherry-picking).

## Gate 4 — staleness detection

```bash
./index.sh && ./index.sh --check            # fresh
echo "// touch" >> <some tracked source file>
./index.sh --check                          # must flag "stale (dirty tree changed)"
git -C <member> checkout -- <file>          # or undo the edit
./index.sh && ./index.sh --check            # fresh again
```

HEAD comparison alone misses uncommitted edits — line numbers drift while the
check still says fresh (observed live: a function moved 106→126 during an
editing session). The tree fingerprint in the header exists for this.

## Gate 5 (optional) — A/B benchmark

Only when the user asks "is it worth it?" or wants numbers. Method that
produced trustworthy results:

- Pick ~10 lookup tasks with ground truth (symbol definitions, "where is
  endpoint X handled", an extensionless plugin function, a cross-repo
  duplicate name).
- Run each task twice via subagents: condition A prompt says "use the index at
  .claude/index/ as primary lookup"; condition B says "do NOT use anything
  under .claude/ — explore normally". Identical otherwise; structured output
  {file, line}.
- Measure from the **transcripts**, not self-report: tool_use count, summed
  input tokens (input + cache read + cache creation per request), summed
  output tokens, wall duration per agent.
- Expect: equal accuracy, roughly equal tool calls on exact-name lookups,
  20-40% less context processed, 30-50% less wall time, and the index side
  free of junk matches (worktree/vendored copies — `git ls-files` excludes
  them by construction, raw scans don't). Vague "where is X handled" tasks
  show the largest gap. Report neutral cases honestly: single-symbol exact
  names in small repos benchmark even.

## Reporting

End with a table: gate / result / evidence (one line each), plus index sizes
(`wc -l .claude/index/*.md`) and generation time. State what was NOT run
(e.g. Gate 5 skipped) so coverage is explicit.
