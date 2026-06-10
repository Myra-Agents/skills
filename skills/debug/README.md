# debug-skill

An **interactive runtime-evidence debugger** as a skill for Claude Code (and any
agent that supports skills — OpenCode, Codex, Cursor). Fix bugs in **any language**
with proof from a real run, not guesses.

```
Hypothesize → Instrument → [asks you to Reproduce] → Analyze → Fix → [asks you: fixed?] → Verify → Clean up
```

The skill runs on the **main thread**, so it asks you directly at the two
human-in-the-loop gates — *reproduce* and *is it fixed?* — and won't strip its
instrumentation until you confirm the bug is gone.

## How it works

1. Starts a localhost log server (`localhost:8787`).
2. Instruments your code to POST structured NDJSON — browser, Go/Rust/Python/Node
   service, CLI, or shell via `curl`. Anything that can make an HTTP request logs to it.
3. Asks you to reproduce; you do; logs land in a file.
4. Reads the log file directly — **no copy-paste** — and reports which hypotheses
   the evidence confirms or rejects.
5. Fixes the confirmed root cause, re-runs, shows a before/after value comparison,
   and asks you whether it's fixed. Iterates if not.

Runtime-agnostic — works anywhere with localhost access.

## Install

```bash
npx add-skill Gamma-Software/debug-skill          # all detected agents
npx add-skill Gamma-Software/debug-skill --global  # globally
```

Or manually:

```bash
git clone https://github.com/Gamma-Software/debug-skill.git
ln -s "$PWD/debug-skill" ~/.claude/skills/debug    # or copy it
```

## Usage

Just describe a bug — it auto-triggers ("debug this", "why is X null",
"handler never fires") — or run `/debug`.

| Agent | Global path | Project path |
|-------|-------------|--------------|
| Claude Code | `~/.claude/skills/debug/` | `.claude/skills/debug/` |
| OpenCode | `~/.config/opencode/skill/debug/` | `.opencode/skill/debug/` |
| Codex | `~/.codex/skills/debug/` | `.codex/skills/debug/` |
| Cursor | `~/.cursor/skills/debug/` | `.cursor/skills/debug/` |

## Structure

```
debug-skill/
├── SKILL.md              # interactive workflow + per-language recipes
└── scripts/
    ├── debug_server.js   # localhost NDJSON log server
    └── debug_cleanup.js  # clear / remove a session log
```

## Requirements

- Node.js 18+

## Lineage

Generalized from [vltansky/debug-skill](https://github.com/vltansky/debug-skill)
(a port of [Cursor's Debug Mode](https://cursor.com/blog/debug-mode)): extended
from frontend-only to any language and made interactive (asks you to reproduce and
to confirm the fix).

## License

MIT
