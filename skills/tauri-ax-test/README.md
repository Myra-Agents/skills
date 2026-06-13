# tauri-ax-test

Author and run **reusable component UI tests for native macOS apps** (Tauri,
Electron, any WKWebView/AppKit app) by driving the **accessibility (AX) tree** —
the same technique the [`macos_automator`](https://github.com/Myra-Agents/macos-automator-mcp)
MCP uses. A skill for Claude Code (and any agent that supports skills — OpenCode,
Codex, Cursor).

```
Register app → inspect AX tree → write a flow → run → assert on read-back → save under apps/<app>/
```

No pixel clicking. Every element is targeted by `AXRole` + name/label, acted on
with `AXPress`, and typed into with real key events so React-controlled inputs
update. The harness is **generic** (drives any native macOS app); tests are
organized **per app** under `apps/<slug>/`, with `apps.index.json` indexing what
each app covers. `apps/myra-agents/` ships as a worked example.

## How it works

1. **Register** the app once — `bun scripts/scaffold.ts <slug> "<window title>"`
   creates `apps/<slug>/` and refreshes the index.
2. **Inspect** the live AX tree (`bun scripts/inspect.ts "<window title>"`, or
   the `macos_automator` MCP) to find stable anchors.
3. **Write a flow** with the typed `app()` builder — each scenario is a single
   `osascript` pass (modals re-render between calls, so flows can't be split).
4. **Run** `bun test apps/<slug>`; the driver returns a JSON transcript and the
   test asserts on values read back from the app.
5. **Index + save** — `bun scripts/index.ts`, then commit. The `*.test.ts` is now
   part of that app's reusable library.

Non-destructive by default: inspect/fill flows end on Cancel/Close; tests that
persist data are gated behind `DESTRUCTIVE=1`.

## Requirements

- macOS + [Bun](https://bun.sh) (`osascript` is built in)
- Accessibility permission for the launching terminal / `bun`
- The app under test running, with its window title set in `apps/<slug>/app.config.ts`
- *(authoring only)* the `macos_automator` MCP — see [SKILL.md](./SKILL.md) for the
  Node-24 install note

## Install

```bash
npx skills add https://github.com/Myra-Agents/skills --skill tauri-ax-test
```

## Use

```bash
bun scripts/scaffold.ts my-app "My App"   # register a new app
bun scripts/inspect.ts "My App"            # dump the AX tree while authoring
bun test                                   # every app (non-destructive)
bun test apps/myra-agents                  # one app's suite
DESTRUCTIVE=1 bun test                     # include tests that persist data
bun scripts/index.ts                       # refresh apps.index.json
```

See [SKILL.md](./SKILL.md) for the full workflow, [references/ax-techniques.md](./references/ax-techniques.md)
for AX gotchas, and [references/writing-tests.md](./references/writing-tests.md)
for the new-test recipe.

## License

MIT — see [LICENSE](./LICENSE).
