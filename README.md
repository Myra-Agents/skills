# Myra Agents — Skills

Agent Skills by [Myra Agents](https://github.com/Myra-Agents). Each skill is a
self-contained folder under [`skills/`](./skills) with a `SKILL.md` (instructions
+ metadata) plus any scripts and assets it needs. Works with Claude Code,
OpenCode, Codex, Cursor, and any agent that supports the
[Agent Skills](https://agentskills.io) standard.

## Skills

| Skill | What it does |
|-------|--------------|
| [`setup-indexing`](./skills/setup-indexing) | Installs a greppable code index so agents locate files/symbols with one grep instead of rescanning the project every session. |
| [`debug`](./skills/debug) | Interactive runtime-evidence debugger for any language — runs a localhost log server, instruments code, reads logs directly, confirms the fix before cleanup. |
| [`build-in-public`](./skills/build-in-public) | Turns a shipped release into review-ready launch drafts — X/Twitter thread, LinkedIn post, and (major releases) a Product Hunt kit — from the repo's changelog. Optional one-command publish. |
| [`consolidate-memory`](./skills/consolidate-memory) | Extracts persistent learnings from the current session and writes them to the agent's auto-memory — classifies signals, drafts memory files, updates the index. Triggers on "consolidate" or proactively after a long debugging session. |
| [`tauri-ax-test`](./skills/tauri-ax-test) | Authors and runs reusable component UI tests for native macOS apps (Tauri/Electron/WKWebView) by driving the accessibility (AX) tree — no pixel clicks. Builds a versioned, CI-able test library under `tests/`. |

## Install

Install a single skill by name with the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add https://github.com/Myra-Agents/skills --skill setup-indexing
npx skills add https://github.com/Myra-Agents/skills --skill debug
npx skills add https://github.com/Myra-Agents/skills --skill build-in-public
npx skills add https://github.com/Myra-Agents/skills --skill consolidate-memory
npx skills add https://github.com/Myra-Agents/skills --skill tauri-ax-test
```

Or install every skill in the repo:

```bash
npx skills add https://github.com/Myra-Agents/skills
```

## License

MIT — see [LICENSE](./LICENSE).
