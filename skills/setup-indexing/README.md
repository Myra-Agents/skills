# setup-indexing-skill

A **greppable code-index installer** as a skill for Claude Code (and any agent
that supports skills — OpenCode, Codex, Cursor). Let agents locate files and
symbols with **one grep on one file** instead of rescanning the whole project
every session.

```
Survey → Install index.sh → Wire up (CLAUDE.md + hook) → Validate with measurements → Report
```

The skill generates an `index.sh` that emits, per repo (or per workspace
member), a single markdown file at `.claude/index/<member>.md` with three
sections — `## dirs`, `## files`, `## symbols` (`path:line:definition`) — so an
agent answers *"where is X?"* without fanning Glob/Grep/Read across the tree.

> Measured on a real multi-repo workspace: same accuracy as free exploration,
> ~30% less context processed, ~40% less wall time, zero junk matches
> (worktree / vendored copies excluded by construction via `git ls-files`).

## How it works

1. **Surveys** the project — single repo vs. multi-member workspace, submodules,
   languages present, existing ctags/LSP tooling.
2. **Installs** `index.sh` (from `assets/index.sh.template`) and wires
   `/.claude/index/` into `.gitignore`. Covers TS/JS (incl. routes), Rust, Go,
   shell, Python, and shebang executables.
3. **Wires it up** — adds a `CLAUDE.md` section so every session greps the index
   first, plus an optional `SessionStart` hook to auto-refresh in seconds.
4. **Validates with measurements** — syntax + full run, edge-case sandbox, a
   measured recall check (≥7/8 elements locatable via the index alone),
   staleness detection, optional A/B benchmark.
5. **Reports** — files installed, index sizes + generation time, validation
   table, what was skipped.

Runtime: stock **macOS bash 3.2 + BSD tools** under `set -euo pipefail`; works on
Linux too. `git ls-files` (not find/rg) is what excludes worktrees,
`node_modules`, and build output by construction.

## Install

```bash
npx add-skill Gamma-Software/setup-indexing-skill           # all detected agents
npx add-skill Gamma-Software/setup-indexing-skill --global  # globally
```

Or manually:

```bash
git clone https://github.com/Gamma-Software/setup-indexing-skill.git
ln -s "$PWD/setup-indexing-skill" ~/.claude/skills/setup-indexing   # or copy it
```

## Usage

Just ask — it auto-triggers ("set up code indexing", "the agent keeps
re-scanning the repo", "make agent search faster", "give me a symbol index /
code map") — or run `/setup-indexing`.

| Agent | Global path | Project path |
|-------|-------------|--------------|
| Claude Code | `~/.claude/skills/setup-indexing/` | `.claude/skills/setup-indexing/` |
| OpenCode | `~/.config/opencode/skill/setup-indexing/` | `.opencode/skill/setup-indexing/` |
| Codex | `~/.codex/skills/setup-indexing/` | `.codex/skills/setup-indexing/` |
| Cursor | `~/.cursor/skills/setup-indexing/` | `.cursor/skills/setup-indexing/` |

## Structure

```
setup-indexing-skill/
├── SKILL.md                  # the 5-step install+validate procedure
├── assets/
│   └── index.sh.template     # the index generator (copied into target project)
├── references/
│   └── validation.md         # the validation gates
└── evals/
    └── evals.json            # trigger evals
```

## Requirements

- `git`, `grep`, `sort`, `cut` (stock POSIX / BSD tools)
- bash 3.2+

## License

MIT
