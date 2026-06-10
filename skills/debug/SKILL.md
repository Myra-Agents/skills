---
name: debug
description: >
  Interactive runtime-evidence debugger for ANY language (frontend, backend, CLI, worker, mobile, shell).
  USE THIS (instead of adding a print/console.log and asking the user to eyeball it) when about to:
  "add a log and ask user to check", "open DevTools and tell me what you see",
  "reproduce the bug and share the output", "check the console/terminal output".
  Triggers: "debug this", "fix this bug", "why isn't this working", "investigate this issue",
  "trace the problem", "value is null/undefined", "request returns wrong data", "handler never runs",
  "UI not updating", "panic/exception thrown".
  Runs a localhost log server, instruments code, asks YOU to reproduce, reads logs directly (no
  copy-paste), then interactively confirms with you whether the bug is fixed before cleaning up.
---

# Debug — Interactive Runtime-Evidence Debugging (any language)

Fix bugs with **runtime evidence**, not guesses. You stay in the loop:

```
Don't guess → Hypothesize → Instrument → [ask you to Reproduce] → Analyze → Fix → [ask you: fixed?] → Verify
```

This skill runs on the **main thread**, so it can ask you questions directly (via
`AskUserQuestion`) at the two human-in-the-loop gates: **reproduce** and **is it
fixed?**. The mechanism is language-agnostic: a localhost HTTP log server receives
NDJSON from instrumented code — browser, Go/Rust/Python/Node service, CLI, shell
via `curl` — and the logs are read directly from a file.

## Hard rules

1. **Never fix without runtime evidence.** Get values from a real run first.
2. **Never guess.** Unsure ⇒ add more instrumentation and reproduce again.
3. **Never ask the user to copy-paste console output.** Capture server-side, `cat` the log file.
4. **Never remove instrumentation before the user confirms the fix.** Keep `#region debug` blocks until verified.
5. **Tag every log with the hypothesis it tests.**

## Locate the bundled scripts

```bash
# Searches common install locations across agents, then the cwd as fallback.
# -L follows symlinks (e.g. a global ~/.claude/skills/debug → repo checkout).
SCRIPTS="$(dirname "$(find -L \
  ~/.claude/skills/debug .claude/skills/debug \
  ~/.config/opencode/skill/debug ~/.codex/skills/debug ~/.cursor/skills/debug . \
  -path '*debug/scripts/debug_server.js' 2>/dev/null | head -1)")"
```

## Workflow

### Phase 1 — Start the log server (no-op if already running)
```bash
node "$SCRIPTS/debug_server.js" /path/to/project &
```
Env: `DEBUG_PORT` (default `8787`), `DEBUG_LOG_DIR` (default `.debug`).
Port busy: `lsof -ti :8787 | xargs kill -9` then restart.

### Phase 2 — Create a session, save the `session_id`
```bash
curl -s -X POST http://localhost:8787/session -d '{"name":"short-bug-desc"}'
```

### Phase 3 — Hypothesize
3–5 hypotheses, each **specific**, **testable** from one log line, covering
**different subsystems**.

### Phase 4 — Instrument
3–8 points (entry/exit, before/after critical ops, each branch), each tagged with
its `hypothesisId`, wrapped in `#region debug` … `#endregion`. High-frequency
events: log only on state change. Recipes:

**Universal — POST NDJSON via native HTTP client or `curl`:**
`{"sessionId":"<id>","msg":"entry","data":{"user_id":null},"hypothesisId":"H1"}` → `http://localhost:8787/log`

**Shell:** `dbg(){ curl -s -X POST http://localhost:8787/log -d "{\"sessionId\":\"$SID\",\"msg\":\"$1\",\"data\":$2,\"hypothesisId\":\"$3\"}" >/dev/null; }`
**JS/TS:** `fetch('http://localhost:8787/log',{method:'POST',body:JSON.stringify({sessionId:SID,msg,data,hypothesisId:h})})` (or `navigator.sendBeacon`)
**Python:** `requests.post('http://localhost:8787/log',json={'sessionId':SID,'msg':msg,'data':data,'hypothesisId':h},timeout=0.5)`
**Go:** `http.Post("http://localhost:8787/log","application/json",bytes.NewReader(jsonBytes))`
**Rust:** `reqwest::blocking::Client::new().post("http://localhost:8787/log").json(&v).send()`

Browser blockers (backend/CLI reach localhost directly): mixed-content, CSP
`connect-src`, CORS preflight → use a same-origin dev-server proxy or `sendBeacon`;
Chrome-extension content scripts relay via the background service worker.

### Phase 5 — Clear logs, then ASK the user to reproduce
```bash
node "$SCRIPTS/debug_cleanup.js" clear /path/to/project $SESSION_ID
```
Give precise reproduction steps (start command, route/args, action, expected vs
observed). Then **call `AskUserQuestion`** — e.g. header "Reproduce", options:
"Done — reproduced it", "Couldn't reproduce", "App won't start". Do NOT read logs
until the user confirms they ran the steps.

### Phase 6 — Analyze
```bash
cat /path/to/project/.debug/debug-$SESSION_ID.log
```
Mark each hypothesis **CONFIRMED / REJECTED / INCONCLUSIVE** with the log line as
evidence. All rejected/inconclusive ⇒ new hypotheses, more instrumentation, repeat
Phase 5. Report the verdicts to the user.

### Phase 7 — Fix
Fix only the confirmed root cause. Keep instrumentation. Tag verification logs `runId:"post-fix"`.

### Phase 8 — Verify, then ASK the user: is it fixed?
Clear logs, give the same reproduction steps, have the user run them again, read
the post-fix logs, and show a **before/after value comparison**. Then **call
`AskUserQuestion`** — header "Fixed?", options:
- **"Fixed"** — bug gone, behavior correct → go to Phase 9.
- **"Still broken"** — → back to Phase 3 with new hypotheses; iterate.
- **"Partially / new issue"** — → treat the residual as a fresh hypothesis set; iterate.

Do not declare success yourself — the user's answer decides.

### Phase 9 — Clean up (only after the user answered "Fixed")
`grep -rn "#region debug"` and remove every block. Confirm removal to the user.

## Five Whys (optional)
For recurring/prod/security bugs, ask "why did this exist?" → CODE (fix) / TEST
(add test) / PROCESS (review/checklist) / SYSTEMIC (document pattern).

## Log format
NDJSON, one entry/line: `{"ts":"…","msg":"entry","data":{"id":5},"hypothesisId":"H1","loc":"app.go:42"}`

## Checklist
- [ ] Server running · session created, `session_id` saved
- [ ] 3–5 hypotheses · 3–8 tagged logs
- [ ] Logs cleared · **user asked to reproduce (AskUserQuestion)**
- [ ] Each hypothesis CONFIRMED/REJECTED/INCONCLUSIVE with evidence
- [ ] Fix on confirmed root cause only · before/after compared
- [ ] **User asked "fixed?" (AskUserQuestion)** — their answer decides
- [ ] Instrumentation removed only after "Fixed"
