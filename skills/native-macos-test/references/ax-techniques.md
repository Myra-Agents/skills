# AX techniques & gotchas

Hard-won notes from driving native macOS apps (especially Tauri/WKWebView)
through the accessibility tree with JXA + System Events. The driver
(`scripts/ax-driver.js`) already bakes these in; this is the *why*.

## Resolve the app by window title, not process name

A dev build's AX process name often differs from the display name (the Myra
Agents dev build is process `app`, window `Myra Agents`). Scan visible processes
for a window whose title matches:

```js
const procs = se.processes.whose({ backgroundOnly: false })();
// ...find the process whose window name === title, set frontmost
```

## One scenario = one `osascript` pass

Modals and menus re-render or close between *separate* `osascript` invocations
(observed: a "New Schedule" modal found on one call was gone on the next). So the
whole open → fill → read → assert → cleanup must run inside a single driver
invocation. That's why the `Flow` builds a step list and runs it once.

## React / controlled inputs need real key events

Setting `AXValue` directly does **not** fire React's `onChange`, so controlled
state never updates. Focus the field, then issue real keys:

```js
field.focused = true;
delay(0.2);            // WKWebView can swallow keys typed too soon after focus
se.keystroke(text);
```

## Find inputs by their label, not coordinates or index

Inputs frequently have no `AXName`. The robust anchor is the field's **preceding
label**: walk in document order, and once you pass an `AXStaticText` whose value
starts with the label, return the next element of the wanted role. Required-field
labels render as `"Schedule Name *"`, so match with `startsWith`, not equality.

## Virtualized lists render the AX tree twice

Long lists (e.g. a schedules table) appear duplicated in the AX tree. Position-
dedup before counting/indexing: collapse elements that share a rounded
`(x, y)`. Use `nth` on the deduped set when there are genuinely several distinct
matches.

## Early-exit DFS for speed

The WKWebView tree is large and AX calls are slow. Flattening the whole tree per
lookup is wasteful — do a depth-first search that returns the first match. Only
fall back to a full enumeration when a specific `nth` is requested. (Cut a 2-test
run from ~58s to ~24s.)

## Permission & timing

- The process that launches `osascript` (your terminal, or `bun`) needs
  **Accessibility** permission, else System Events calls hang and the driver
  returns no output. Grant it in System Settings → Privacy & Security →
  Accessibility.
- The **first** AX call pays a TCC handshake + tree-build cost; budget seconds
  per step and set a generous test timeout (the bundled scripts use 60s).

## Never auto-commit a destructive action

Create / Send / Delete / Pay persist or fire side effects. Tests that only
inspect must end on **Cancel/Close**. Gate persisting tests behind an env flag
(`DESTRUCTIVE=1`) and `test.if(...)` so the default run is safe to repeat.
