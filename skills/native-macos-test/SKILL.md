---
name: native-macos-test
description: >
  Author and run reusable component UI tests for a NATIVE macOS app (Tauri,
  Electron, or any WKWebView/AppKit app) by driving the macOS accessibility (AX)
  tree — match elements by AXRole + name/label, act with AXPress, type with real
  key events. YOU (the agent) run everything; the user just converses. The
  harness is vendored into the app repo (default tests/native/) so the test
  library is versioned WITH the app and self-locating across sessions.
  USE THIS when asked to: "test the desktop/Tauri app", "write a UI test for the
  native app", "add an AX/accessibility test", "automate clicking through the
  app", "add this flow to the test library", "component test for the macOS app",
  "regression test the app UI". Triggers: "test the app", "UI test", "AX test",
  "automate the desktop app", "drive the app", "macOS app test".
  Pixel-coordinate clicking is banned — everything targets stable AX anchors.
---

# native-macos-test — AX-driven component tests for native macOS apps

Drive a running native app through its **accessibility (AX) tree** (the
`macos_automator` technique) and accumulate the flows into a **reusable,
versioned test library that lives in the app's own repo**.

**You run everything.** The user invokes this skill and converses; you execute
all `bun`/`osascript` work via Bash and report results + proof. Never hand the
user a command to run — run it yourself.

```
Locate/init the AX home → inspect AX tree → write a flow → run → assert on read-back → index
```

## 0. Locate (or initialize) the AX test home

The harness is **vendored into the app repo** and marked by a `.native-macos.json`
file. On every invocation, first find it:

```bash
REPO=$(git rev-parse --show-toplevel)
HOME_DIR=$(find "$REPO" -name .native-macos.json -not -path '*/node_modules/*' -print -quit)
HOME_DIR=${HOME_DIR:+$(dirname "$HOME_DIR")}
echo "AX home: ${HOME_DIR:-<not initialized>}"
```

- **Found** → that directory is the home; `cd` there for all commands below.
- **Not found** → initialize it (next step). Default location `tests/native/`,
  unless the user names another.

### Initialize (first time only)

1. **Find this skill's bundled harness** (the vendor payload):
   ```bash
   HARNESS=$(find "$HOME" "$REPO/.claude" /root/.claude ~/.claude -type d \
     -path '*/native-macos-test/harness' -not -path '*/node_modules/*' -print -quit 2>/dev/null)
   echo "harness source: $HARNESS"
   ```
   (It sits next to this SKILL.md, in `harness/`.)
2. **Vendor it** into the app repo and confirm the marker travels:
   ```bash
   mkdir -p "$REPO/tests/native"
   cp -R "$HARNESS"/. "$REPO/tests/native/"
   test -f "$REPO/tests/native/.native-macos.json" && echo "vendored OK"
   ```
3. **Register the app** (asks you nothing if you already know the window title;
   otherwise determine it — see step 1):
   ```bash
   cd "$REPO/tests/native"
   bun scripts/scaffold.ts <slug> "<Window Title>" ["Display Name"]
   ```
4. **Record the home** so humans and future agents see it: add a one-line pointer
   to the app repo's `CLAUDE.md` (e.g. *"Native AX UI tests live in
   `tests/native/` — driven by the `native-macos-test` skill"*). The `.native-macos.json`
   marker is the machine anchor; this is the human one.

## 1. Identify the app (window title)

The driver finds the app by **exact window title** (robust — a dev build's AX
process name often differs from the display name). To discover it from the
running app:

```bash
osascript -l JavaScript -e 'Application("System Events").processes.whose({backgroundOnly:false})().flatMap(p=>{try{return p.windows().map(w=>w.name())}catch(e){return[]}}).filter(Boolean).join("\n")'
```

Pick the title, set it in `apps/<slug>/app.config.ts` (scaffold writes it). If
ambiguous, ask the user which window.

## 2. Inspect the live AX tree (authoring)

```bash
cd "$HOME_DIR"
bun scripts/inspect.ts "<Window Title>"        # interesting nodes
bun scripts/inspect.ts "<Window Title>" --all  # everything + geometry
```

(Or, if the `macos_automator` MCP is connected, dump the tree via
`execute_script` — same data.) Pick **stable anchors**: `AXRole`+`AXName` for
buttons/links/tabs, and the input's **preceding label** for fields. Labels marked
`*` (required) start with the label text, so `"Schedule Name"` matches
`"Schedule Name *"`.

## 3. Write the flow

Create `apps/<slug>/components/<feature>.test.ts` with the `app()` builder:

```ts
import { test, expect, describe } from "bun:test";
import { app, assertFlowOk } from "@ax";   // tsconfig path alias -> scripts/ax.ts
import { APP } from "../app.config";

describe("Schedules", () => {
  test("New Schedule modal accepts input", async () => {
    const r = await app(APP.windowTitle)
      .click("AXLink", "Schedules")
      .waitFor("AXHeading", "Schedules")
      .click("AXButton", "New Schedule")
      .waitFor("AXHeading", "New Schedule")
      .fillByLabel("Schedule Name", "AXTextField", "My test")  // focus + keystroke
      .readByLabel("Schedule Name", "AXTextField", "name")     // value -> reads.name
      .assertExists({ role: "AXButton", name: "Create" })
      .click("AXButton", "Cancel")          // non-destructive cleanup
      .run();
    assertFlowOk(r);
    expect(r.reads.name).toBe("My test");
  });
});
```

Selector fields: `role` (required), `name`, `desc`, `valuePrefix`, `nth` (index
among position-deduped matches — virtualized lists render twice), `settle`.

## 4. Run and report

```bash
cd "$HOME_DIR"
bun test                       # every app, non-destructive
bun test apps/<slug>           # one app's suite
bun test <feature>             # one file by name fragment
DESTRUCTIVE=1 bun test         # include persisting tests (writes real data)
```

Iterate on anchors until green, then **regenerate the index and report** to the
user (pass/fail counts + what's covered):

```bash
bun scripts/index.ts           # refresh apps.index.json
bun scripts/index.ts --check   # CI: fail if stale
```

## Hard rules

1. **You run it, not the user.** Execute every command via Bash; report results.
2. **No pixel coordinates.** Match by role + name/label. No stable name ⇒ prefer
   `label` (field-after-its-label) over `nth`.
3. **One scenario = one flow = one `osascript` pass.** Modals/menus re-render or
   close between separate invocations, so open → fill → read → assert → cleanup
   must all be in a single `Flow.run()`.
4. **Read back, don't assume.** Every fill is followed by a read; assert on the
   returned value.
5. **Non-destructive by default.** Inspect/fill flows end on **Cancel/Close**.
   Anything that persists (Create/Send/Delete) is gated behind `DESTRUCTIVE=1`
   and `test.if(!!process.env.DESTRUCTIVE)`, and you confirm with the user before
   running it.
6. **React/controlled inputs need real keys** — handled by `fill`/`fillByLabel`
   (focus + `keystroke`); setting `AXValue` alone won't fire `onChange`.

## Prerequisites

- **macOS** + **Bun**; `osascript` is built in.
- **Accessibility permission** for whatever launches the tests (your terminal or
  `bun`): System Settings → Privacy & Security → Accessibility. Without it,
  System Events calls hang and the driver returns no output.
- The **app under test must be running**.
- **`macos_automator` MCP — optional, authoring only** (interactive AX
  exploration). Not needed to run tests (`scripts/inspect.ts` covers it). To
  install the Myra fork (needs Node ≥24 — pin a Homebrew node so Claude Code's
  Node 18 runtime doesn't crash it):
  ```bash
  claude mcp add macos-automator -- /opt/homebrew/opt/node@26/bin/node \
    /opt/homebrew/lib/node_modules/npm/bin/npx-cli.js -y \
    --package @steipete/macos-automator-mcp macos-automator-mcp
  ```
  Tools surface only after a Claude Code **session restart**.

## Files (in this skill)

| Path | Role |
|------|------|
| `harness/` | The vendor payload — copied into the app repo's AX home |
| `harness/scripts/ax-driver.js` | JXA core — runs a whole flow in one `osascript` pass, returns a JSON transcript |
| `harness/scripts/ax.ts` | Typed `Flow` builder (imported as `@ax`) |
| `harness/scripts/inspect.ts` · `scaffold.ts` · `index.ts` | author / register / index |
| `harness/apps/_template/` | scaffold source (`.tmpl`) |
| `harness/.native-macos.json` | discovery marker that travels with the vendored home |
| `references/ax-techniques.md` | AX gotchas cookbook |
| `references/writing-tests.md` | step-by-step for adding a new component test |

## Gotchas (see `references/ax-techniques.md`)

- **Dev build's AX process name ≠ display name** → resolve by **window title**.
- **Modal closes/re-renders between osascript calls** → one flow per pass.
- **Virtualized lists render the AX tree twice** → driver position-dedups; use `nth`.
- **`AXValue` set alone won't update React** → `fill` uses focus + `keystroke`.
- **First AX call is slow** (TCC handshake + tree size) → budget seconds/step; the
  bundled scripts set a 60s test timeout.
