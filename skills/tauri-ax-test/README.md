# tauri-ax-test

Author and run **reusable component UI tests for native macOS apps** (Tauri,
Electron, any WKWebView/AppKit app) by driving the **accessibility (AX) tree** —
the same technique the [`macos_automator`](https://github.com/Myra-Agents/macos-automator-mcp)
MCP uses. A skill for Claude Code (and any agent that supports skills — OpenCode,
Codex, Cursor).

```
Inspect AX tree → write a flow (role+name/label anchors) → run → assert on read-back → save to tests/
```

No pixel clicking. Every element is targeted by `AXRole` + name/label, acted on
with `AXPress`, and typed into with real key events so React-controlled inputs
update. Tests accrue into a versioned, CI-able library under `tests/`.

## How it works

1. **Inspect** the live app's AX tree (`bun scripts/inspect.ts "<window title>"`,
   or the `macos_automator` MCP) to find stable anchors.
2. **Write a flow** with the typed `app()` builder — each scenario is a single
   `osascript` pass (modals re-render between calls, so flows can't be split).
3. **Run** with `bun test`; the driver returns a JSON transcript and the test
   asserts on values read back from the app.
4. **Save** the `*.test.ts` — it's now part of the reusable library.

Non-destructive by default: inspect/fill flows end on Cancel/Close; tests that
persist data are gated behind `DESTRUCTIVE=1`.

## Requirements

- macOS + [Bun](https://bun.sh) (`osascript` is built in)
- Accessibility permission for the launching terminal / `bun`
- The app under test running, with its window title set in `tests/app.config.ts`
- *(authoring only)* the `macos_automator` MCP — see [SKILL.md](./SKILL.md) for the
  Node-24 install note

## Install

```bash
npx skills add https://github.com/Myra-Agents/skills --skill tauri-ax-test
```

## Use

```bash
bun test                 # run the whole library (non-destructive)
bun test schedules       # one component
DESTRUCTIVE=1 bun test   # include tests that persist data
bun scripts/inspect.ts "Myra Agents"   # dump the AX tree while authoring
```

See [SKILL.md](./SKILL.md) for the full workflow, [references/ax-techniques.md](./references/ax-techniques.md)
for AX gotchas, and [references/writing-tests.md](./references/writing-tests.md)
for the new-test recipe.

## License

MIT — see [LICENSE](./LICENSE).
