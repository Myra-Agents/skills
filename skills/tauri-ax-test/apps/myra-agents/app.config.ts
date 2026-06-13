// app.config.ts — the app under test. One place to retarget the whole suite.
//
// `windowTitle` is how the AX driver finds the running app: it scans visible
// processes for a window whose title matches exactly. This is more robust than
// the process name, which for dev builds often differs from the display name
// (e.g. the Myra Agents dev build's AX process is `app`, window is `Myra Agents`).

export const APP = {
  /** Exact window title to drive (Tauri sets this from the app config). */
  windowTitle: "Myra Agents",
  /** Human label for reports. */
  name: "Myra Agents",
} as const;
