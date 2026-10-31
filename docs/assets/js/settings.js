// Site settings: saved on this device, and to the learner's account when signed in.
// The early part of this (theme and sizes) is also applied by an inline script in
// <head> so pages don't flash the wrong theme while loading.
const KEY = "atlas.settings";

export const DEFAULTS = {
  theme: "auto",        // auto | light | dark
  textSize: 1,          // multiplier for all text
  codeSize: 1,          // multiplier for code in editors
  wrap: false,          // wrap long lines in code editors
  motion: "auto",       // auto (follow the device) | reduce
  xraySpeed: 800,       // milliseconds per step when X-ray plays
  xrayEvery: false,     // X-ray starts with "show every object" ticked
  tutorButton: true,    // show the floating "Ask the tutor" button
};

const subs = new Set();
let current = read();

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
}

export function settings() { return current; }

export function apply(s = current) {
  const root = document.documentElement;
  if (s.theme === "auto") root.removeAttribute("data-theme"); else root.dataset.theme = s.theme;
  root.style.setProperty("--text-scale", s.textSize);
  root.style.setProperty("--code-scale", s.codeSize);
  root.classList.toggle("reduce-motion", s.motion === "reduce");
}

export function update(patch, { sync = true } = {}) {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage blocked */ }
  apply();
  subs.forEach((f) => f(current));
  if (sync) import("./progress.js?v=5b063fa476").then(({ progress }) => progress.set("settings", current));
}

export function reset() { update({ ...DEFAULTS }); }
export function onSettings(fn) { subs.add(fn); return () => subs.delete(fn); }

// When signed in on another device, the account's settings arrive with the progress sync.
import("./progress.js?v=5b063fa476").then(({ progress }) => {
  progress.subscribe((key) => {
    if (key !== "settings" && key !== "*") return;
    const remote = progress.get("settings");
    if (remote && JSON.stringify(remote) !== JSON.stringify(current)) update(remote, { sync: false });
  });
});

apply();
