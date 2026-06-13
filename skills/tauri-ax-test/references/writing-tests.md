# Writing a new component test

A repeatable recipe for adding a screen/component to the library.

## 0. Register the app (once)

```bash
bun scripts/scaffold.ts my-app "My App Window Title" ["Display Name"]
```

Creates `apps/my-app/{app.config.ts, components/example.test.ts}` and refreshes
`apps.index.json`. Skip this for an app that's already under `apps/` (e.g. the
`myra-agents` example).

## 1. Make the app reachable

The app must be **running**, and `apps/<slug>/app.config.ts` must hold its exact
window title (the scaffold wrote it; edit if needed):

```ts
export const APP = { windowTitle: "My App Window Title", name: "My App" } as const;
```

## 2. Inspect the live AX tree

```bash
bun scripts/inspect.ts "Myra Agents"          # interactive elements + text
bun scripts/inspect.ts "Myra Agents" --all    # full tree + geometry
```

Look for stable anchors:

- **Buttons / links / tabs** → `AXRole` + `AXName` (e.g. `AXButton "New Schedule"`).
- **Inputs** → the **label** static text just before them (e.g. `"Schedule Name"`).
- **List rows / status text** → `AXStaticText` with a `valuePrefix`.

Avoid: positions, `nth` indices that depend on data ordering.

## 3. Write the flow

Create `apps/<slug>/components/<feature>.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { app, assertFlowOk } from "@ax";       // path alias -> scripts/ax.ts
import { APP } from "../app.config";

describe("<Feature>", () => {
  test("does the thing", async () => {
    const r = await app(APP.windowTitle)
      .click("AXLink", "<Sidebar item>")
      .waitFor("AXHeading", "<Screen heading>")
      // ...act...
      .readByLabel("<Label>", "AXTextField", "value")
      .click("AXButton", "Cancel")     // non-destructive cleanup
      .run();

    assertFlowOk(r);
    expect(r.reads.value).toBe("<expected>");
  });
});
```

## 4. Builder cheat-sheet

| Method | Does |
|--------|------|
| `app(title)` | start a flow (resolves the window) |
| `.click(role, name?, extra?)` | AXPress a match (`extra`: `desc`, `valuePrefix`, `nth`, `settle`) |
| `.fillByLabel(label, role, text)` | focus + keystroke into the field after `label` |
| `.fill(selector, text)` | focus + keystroke into a selector match |
| `.readByLabel(label, role, as)` | read field-after-label value into `reads[as]` |
| `.read(selector, as)` | read a selector match into `reads[as]` |
| `.waitFor(role, name?, timeout?)` | poll until present (default 3s) |
| `.assertExists(selector, not?)` | element present (or absent with `not=true`) |
| `.assertEquals(get, equals)` / `.assertContains(get, substring)` | driver-side assertion on a read |
| `.dump(as?, maxDepth?)` | capture the subtree into `reads[as]` for debugging |
| `.raw(step)` | push a raw driver step the builder doesn't cover |

## 5. Assertions: two layers

- **Driver-side** (`assertExists`, `waitFor`, `assertEquals`) run *inside* the
  flow — use them when a later step depends on the assertion (e.g. wait for a
  modal before filling it).
- **TS-side** (`expect(r.reads.x)`) run after `run()` — preferred for value
  checks; they give the nicest failure messages.

Always call `assertFlowOk(r)` first — it throws a per-step ✓/✗ transcript.

## 6. Keep it non-destructive

End inspect/fill flows on **Cancel/Close**. If the test must persist data, gate
it:

```ts
test.if(!!process.env.DESTRUCTIVE)("persists on Create", async () => { /* ... */ });
```

Run those explicitly with `DESTRUCTIVE=1 bun test`.

## 7. Index, run & commit

```bash
bun test apps/<slug>   # iterate until green (or `bun test <feature>`)
bun scripts/index.ts   # refresh apps.index.json
```

Commit the new `*.test.ts` **and** the updated `apps.index.json` — the test is
now part of that app's reusable library.
