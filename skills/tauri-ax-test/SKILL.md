---
name: tauri-ax-test
description: >
  Author and run reusable component UI tests for a NATIVE macOS app (Tauri,
  Electron, or any WKWebView/AppKit app) by driving the macOS accessibility (AX)
  tree — match elements by AXRole + name/label, act with AXPress, type with real
  key events. Builds up a versioned, CI-able test library under the skill.
  USE THIS when asked to: "test the desktop/Tauri app", "write a UI test for the
  native app", "add an AX/accessibility test", "automate clicking through the
  app", "add this flow to the test library", "component test for the macOS app",
  "regression test the app UI". Triggers: "test the app", "UI test", "AX test",
  "automate the desktop app", "drive the app", "macOS app test".
  Pixel-coordinate clicking is banned — everything targets stable AX anchors.
---

# tauri-ax-test — AX-driven component tests for native macOS apps

Drive a running native app through its **accessibility (AX) tree** — the same
technique the `macos_automator` MCP uses — and accumulate the flows into a
**reusable, versioned test library** (`tests/`). Tests run headless-ish via
`bun test` over `osascript`; no MCP needed at run time.

```
Register app → inspect AX tree → write a flow (role+name/label anchors) → run → assert on read-back → save under apps/<app>/
```

The harness (`scripts/`) is **generic** — it drives any native macOS app. The
tests are organized **per app** under `apps/<slug>/`, and `bun scripts/index.ts`
maintains `apps.index.json`, a greppable registry of every app, its window
title, and the components it covers. `apps/myra-agents/` ships as a worked
example; add your own app with `scaffold`.

## Why AX, not coordinates

Pixel clicks drift (focus/offset). The AX tree is stable and semantic:

- **Target by `AXRole` + `AXName`/`AXDescription`/value or by label** — never
  pixel offsets.
- **Tauri/Electron/WKWebView apps are usually fully exposed in AX** — links,
  buttons, fields all appear. Try AX first.
- **Read state back after every action** — no blind typing; assertions compare
  the value the app actually holds.

## Hard rules

1. **No pixel coordinates.** Match by role + name/label. If an element has no
   stable name, prefer `label` (field-after-its-label) over `nth`.
2. **One scenario = one flow = one `osascript` pass.** Modals/menus re-render or
   close between separate invocations, so open → fill → read → assert → cleanup
   must all be in a single `Flow.run()`. The driver enforces this.
3. **Read back, don't assume.** Every fill is followed by a read; assert on the
   returned value.
4. **Non-destructive by default.** A test that only inspects/fills must end by
   pressing **Cancel/Close** so nothing persists. Any test that persists
   (Create/Send/Delete) is gated behind `DESTRUCTIVE=1` and `test.if(...)`.
5. **React/controlled inputs need real keys.** The driver focuses the field then
   `keystroke`s — setting `AXValue` alone won't fire `onChange`. (Already handled
   by `fill`/`fillByLabel`.)

## Prerequisites

- **macOS** + **Bun** (`bun --version`). `osascript` is built in.
- **Accessibility permission** for whatever launches the tests (your terminal
  app, or `bun`): System Settings → Privacy & Security → Accessibility. Without
  it, System Events calls hang and the driver returns no output.
- The **app under test must be running** with the window title set in
  `apps/<slug>/app.config.ts`.
- **`macos_automator` MCP — only for *authoring*** (interactive AX tree
  exploration). Not required to *run* tests (the bundled `scripts/inspect.ts`
  dumps the tree standalone). If you want the MCP, install the Myra fork — it
  needs Node ≥24, so pin a Homebrew node by absolute path (Claude Code's runtime
  is Node 18 and would crash the server):

  ```bash
  claude mcp add macos-automator -- /opt/homebrew/opt/node@26/bin/node \
    /opt/homebrew/lib/node_modules/npm/bin/npx-cli.js -y \
    --package @steipete/macos-automator-mcp macos-automator-mcp
  ```

  MCP tools surface only after a Claude Code **session restart**.

## Authoring loop

0. **Register the app** (once per app). Picks a kebab-case slug + the exact
   window title:
   ```bash
   bun scripts/scaffold.ts my-app "My App Window Title" ["Display Name"]
   ```
   Creates `apps/my-app/{app.config.ts, components/example.test.ts}` and
   refreshes the index. (`apps/myra-agents/` already exists as an example.)
1. **Inspect** the live tree to find stable anchors:
   ```bash
   bun scripts/inspect.ts "My App Window Title"        # interesting nodes
   bun scripts/inspect.ts "My App Window Title" --all  # everything + geometry
   ```
   (Or, with the MCP, dump the tree via `execute_script`.)
2. **Pick anchors** — prefer `AXRole`+`AXName` for buttons/links, and `label`
   (the field's preceding `AXStaticText`) for inputs. Note labels marked `*`
   (required) start with the label text, so `"Schedule Name"` matches
   `"Schedule Name *"`.
3. **Write a flow** in `apps/<slug>/components/<feature>.test.ts` with the
   `app()` builder (see `apps/myra-agents/components/schedules.test.ts`).
4. **Run** `bun test apps/<slug>` — fix anchors until green. End the flow with a
   Cancel/Close cleanup step.
5. **Index + save** — `bun scripts/index.ts` to refresh `apps.index.json`, then
   commit both. The test is now part of the reusable, per-app library.

## Running the library

```bash
bun test                       # every app, non-destructive
bun test apps/myra-agents      # one app's whole suite
bun test schedules             # one file (by name fragment)
DESTRUCTIVE=1 bun test         # include persisting tests (writes real data)

bun scripts/index.ts           # regenerate apps.index.json + print a summary
bun scripts/index.ts --check   # CI: fail if the index is stale
```

AX traversal is slow (seconds per step); the bundled scripts set a 60s test
timeout. Keep flows focused.

## The flow API (`scripts/ax.ts`)

```ts
import { app, assertFlowOk } from "@ax";   // tsconfig path alias -> scripts/ax.ts

const r = await app("Myra Agents")          // resolveWindow by title
  .click("AXLink", "Schedules")             // AXPress by role+name
  .waitFor("AXHeading", "Schedules")        // poll until present
  .click("AXButton", "New Schedule")
  .waitFor("AXHeading", "New Schedule")
  .fillByLabel("Schedule Name", "AXTextField", "My test")  // focus + keystroke
  .readByLabel("Schedule Name", "AXTextField", "name")     // value -> reads.name
  .assertExists({ role: "AXButton", name: "Create" })
  .click("AXButton", "Cancel")              // non-destructive cleanup
  .run();

assertFlowOk(r);                            // throws a readable transcript on failure
expect(r.reads.name).toBe("My test");
```

Selector fields: `role` (required), `name`, `desc`, `valuePrefix`, `nth` (index
among position-deduped matches — for virtualized lists that render twice),
`settle` (seconds to wait after the action).

## Files

| Path | Role |
|------|------|
| `scripts/ax-driver.js` | JXA core — runs a whole flow in one `osascript` pass, returns a JSON transcript |
| `scripts/ax.ts` | Typed `Flow` builder (imported as `@ax`); spawns the driver and parses results |
| `scripts/inspect.ts` | CLI AX-tree dumper for authoring (`bun scripts/inspect.ts "<title>"`) |
| `scripts/scaffold.ts` | Register a new app: `bun scripts/scaffold.ts <slug> "<title>"` |
| `scripts/index.ts` | (Re)generate `apps.index.json`; `--check` for CI staleness |
| `apps/_template/` | Scaffold source (`.tmpl`) — copied + substituted per app |
| `apps/<slug>/app.config.ts` | One app's window title — retarget that app's suite here |
| `apps/<slug>/components/*.test.ts` | One app's reusable library (one file per screen/component) |
| `apps.index.json` | Generated registry: every app → window title → components + test names |
| `references/ax-techniques.md` | AX gotchas cookbook (process resolution, controlled inputs, virtualized lists…) |
| `references/writing-tests.md` | Step-by-step for adding a new component test |

## Gotchas (these bit during authoring — see `references/ax-techniques.md`)

- **Dev build's AX process name ≠ display name** (Myra Agents dev = process
  `app`, window `Myra Agents`) → resolve by **window title**, not process name.
- **Modal closes/re-renders between osascript calls** → one flow per pass.
- **Virtualized lists render the AX tree twice** → the driver position-dedups;
  use `nth` on the deduped set.
- **`AXValue` set alone won't update React** → `fill` uses focus + `keystroke`.
- **First AX call is slow** (TCC handshake + tree size) → expect seconds/step.
