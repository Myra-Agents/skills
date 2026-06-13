# native-macos-test

Author and run **reusable component UI tests for native macOS apps** (Tauri,
Electron, any WKWebView/AppKit app) by driving the **accessibility (AX) tree** —
the same technique the [`macos_automator`](https://github.com/Myra-Agents/macos-automator-mcp)
MCP uses. A skill for Claude Code (and any agent that supports skills — OpenCode,
Codex, Cursor).

```
Locate/init the AX home → inspect AX tree → write a flow → run → assert on read-back → index
```

**The agent runs everything.** You just invoke the skill and converse — Claude
inspects the live app, writes the flow, runs `bun test`, and reports results. No
commands for you to type. No pixel clicking: elements are matched by `AXRole` +
name/label, acted on with `AXPress`, typed into with real key events so
React-controlled inputs update.

## Where the tests live

The harness is **vendored into the app's own repo** (default `tests/native/`),
marked by a `.native-macos.json` file. So the test library is **versioned with the
app**, self-contained, and **self-locating** — on the next session the skill
finds the home by its marker, no external config needed.

```
<app-repo>/tests/native/        # the AX test home (vendored)
  .native-macos.json                # discovery marker
  scripts/                      # generic harness (driver, ax.ts, inspect, scaffold, index)
  apps/<slug>/
    app.config.ts               # window title
    components/*.test.ts         # this app's reusable test library
  apps.index.json               # generated: app -> window title -> components + tests
```

This repo (the skill) ships the **generic** harness under `harness/` plus the
agent instructions in [SKILL.md](./SKILL.md). It contains no app-specific tests —
those live in each app's repo.

## Requirements

- macOS + [Bun](https://bun.sh) (`osascript` is built in)
- Accessibility permission for the launching terminal / `bun`
- The app under test running
- *(optional, authoring)* the `macos_automator` MCP — see [SKILL.md](./SKILL.md)

## Install

```bash
npx skills add https://github.com/Myra-Agents/skills --skill native-macos-test
```

Then just ask: *"test the desktop app's Schedules screen"* — the skill locates or
initializes the AX home in your app repo and takes it from there.

## Reference

- [SKILL.md](./SKILL.md) — the agent workflow (locate/init, author, run, index)
- [references/ax-techniques.md](./references/ax-techniques.md) — AX gotchas cookbook
- [references/writing-tests.md](./references/writing-tests.md) — new-test recipe

## License

MIT — see [LICENSE](./LICENSE).
