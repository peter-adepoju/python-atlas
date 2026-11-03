import "./common.js?v=7343aa5d1b";
import { $, h, toast } from "../site.js?v=7343aa5d1b";
import { settings, update, reset, onSettings, DEFAULTS } from "../settings.js?v=7343aa5d1b";
import { mountConsoles } from "../console.js?v=7343aa5d1b";

const GROUPS = [
  ["Appearance", [
    { key: "theme", title: "Theme", desc: "Light, dark, or follow your device's setting.", options: [["auto", "Match device"], ["light", "Light"], ["dark", "Dark"]] },
    { key: "textSize", title: "Text size", desc: "Size of all text on the site.", options: [[0.9, "Small"], [1, "Normal"], [1.12, "Large"], [1.25, "Extra large"]] },
    { key: "codeSize", title: "Code size", desc: "Size of code in editors and consoles.", options: [[0.9, "Small"], [1, "Normal"], [1.15, "Large"], [1.3, "Extra large"]] },
  ]],
  ["Coding", [
    { key: "wrap", title: "Wrap long lines", desc: "Long lines of code continue on the next line instead of scrolling sideways.", toggle: true },
    { key: "xraySpeed", title: "X-ray playback speed", desc: "How fast Play moves through the steps.", options: [[1400, "Slow"], [800, "Normal"], [400, "Fast"]] },
    { key: "xrayEvery", title: "Show every object in X-ray", desc: "Draw numbers and strings inside lists as separate objects with arrows. More detailed, busier.", toggle: true },
  ]],
  ["Comfort", [
    { key: "motion", title: "Reduce motion", desc: "Turn off animations and moving demos.", toggle: true, on: "reduce", off: "auto" },
    { key: "tutorButton", title: "Show the tutor button", desc: "The floating 'Ask the tutor' button. Error messages still offer the tutor when it's hidden.", toggle: true },
  ]],
];

function control(item) {
  const s = settings();
  if (item.toggle) {
    const on = item.on !== undefined ? s[item.key] === item.on : !!s[item.key];
    return h("button", { type: "button", class: "switch", role: "switch", "aria-checked": String(on), "aria-label": item.title,
      onclick: () => update({ [item.key]: item.on !== undefined ? (on ? item.off : item.on) : !on }) });
  }
  return h("div", { class: "seg", role: "group", "aria-label": item.title },
    item.options.map(([v, label]) => h("button", { type: "button", "aria-pressed": String(s[item.key] === v), onclick: () => update({ [item.key]: v }) }, label)));
}

function draw() {
  const focused = document.activeElement && document.activeElement.closest(".setting") ? document.activeElement.closest(".setting").querySelector(".setting-t").textContent : null;
  const focusedText = document.activeElement ? document.activeElement.textContent : "";
  $("#settings").replaceChildren(...GROUPS.map(([name, items]) => h("section", { class: "settings-group" },
    h("h2", {}, name),
    h("div", { class: "panel" }, items.map((it) => h("div", { class: "setting" },
      h("div", { class: "setting-t" }, it.title), h("p", { class: "setting-d", style: "margin:0" }, it.desc),
      h("div", { class: "setting-c" }, control(it))))))));
  if (focused) {
    const row = [...document.querySelectorAll(".setting")].find((r) => r.querySelector(".setting-t").textContent === focused);
    const btn = row && ([...row.querySelectorAll(".setting-c button")].find((b) => b.textContent === focusedText) || row.querySelector(".setting-c button"));
    if (btn) btn.focus();
  }
}
draw();
onSettings(draw);
$("#reset-settings").onclick = () => { reset(); toast("Settings restored"); };
void DEFAULTS;

if (window.CodeMirror) mountConsoles(); else addEventListener("load", () => mountConsoles());
