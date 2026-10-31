// Eight switches: the same bits read as a number, as binary and as a character.
import { h } from "../site.js?v=5b063fa476";

export default function bits(el, { start = 65 } = {}) {
  let value = start;
  const row = h("div", { class: "bits-row", style: "display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:.35rem;margin:.6rem 0" });
  const num = h("input", { type: "number", min: 0, max: 255, class: "w-input", style: "width:6em", "aria-label": "Number from 0 to 255" });
  const readout = h("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-top:.4rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Click the switches, or type a number:"), num), row, readout, note);

  function draw() {
    row.replaceChildren();
    for (let i = 7; i >= 0; i--) {
      const on = (value >> i) & 1;
      const b = h("button", {
        type: "button", "aria-pressed": on ? "true" : "false", "aria-label": `bit worth ${1 << i}`,
        style: `display:grid;gap:.15rem;justify-items:center;padding:.5rem 0;border-radius:6px;cursor:pointer;font:inherit;
          border:2px solid ${on ? "var(--yellow)" : "var(--line)"};background:${on ? "var(--yellow-soft)" : "var(--paper)"};color:var(--ink)`,
        onclick: () => { value ^= 1 << i; draw(); },
      }, h("span", { style: "font:700 1.4rem var(--f-code)" }, on), h("span", { style: "font-size:.72rem;color:var(--ink-3)" }, `${1 << i}`));
      row.append(b);
    }
    num.value = value;
    const ch = value >= 32 && value < 127 ? `'${String.fromCharCode(value)}'` : value === 10 ? "'\\n' (new line)" : value === 9 ? "'\\t' (tab)" : "(not printable)";
    const cell = (label, v) => h("div", { class: "panel", style: "padding:.6rem .8rem" }, h("div", { class: "w-label" }, label), h("div", { style: "font:600 1.15rem var(--f-code)" }, v));
    readout.replaceChildren(
      cell("As a whole number", String(value)),
      cell("In Python", `0b${value.toString(2).padStart(8, "0")}`),
      cell("As a character: chr(" + value + ")", ch));
    const parts = [];
    for (let i = 7; i >= 0; i--) if ((value >> i) & 1) parts.push(1 << i);
    note.textContent = parts.length ? `${parts.join(" + ")} = ${value}. Same eight switches, three meanings: the type decides how bits are read.` : "All switches off: 0.";
  }
  num.addEventListener("input", () => { const v = Math.max(0, Math.min(255, parseInt(num.value || "0", 10) || 0)); value = v; draw(); });
  draw();
}
