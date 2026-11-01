// Caesar cipher: the alphabet and its shifted copy, letter by letter, plus a live encryption.
import { h } from "../site.js?v=8fe38f9496";

const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function cipherwheel(el, { shift = 3, text = "Meet me at noon" } = {}) {
  const sl = h("input", { type: "range", min: 0, max: 25, value: shift, style: "flex:1 1 200px", "aria-label": "Shift" });
  const num = h("output", { style: "font:700 1.1rem var(--f-code);min-width:2.5em" });
  const msg = h("input", { class: "w-input", value: text, spellcheck: "false", style: "flex:1 1 260px", "aria-label": "Message" });
  const strip = h("div", { style: "display:grid;grid-template-columns:repeat(26,minmax(1.4em,1fr));gap:2px;margin-top:.8rem;overflow-x:auto;font:600 .85rem var(--f-code);text-align:center" });
  const out = h("div", { class: "w-out", style: "margin-top:.7rem" });
  const back = h("div", { class: "w-out", style: "margin-top:.4rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "shift"), sl, num),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, h("span", { class: "w-label" }, "message"), msg),
    strip, out, back, note);

  const enc = (s, k) => [...s].map((c) => {
    const up = c.toUpperCase();
    const i = A.indexOf(up);
    if (i < 0) return c;
    const d = A[(i + k) % 26];
    return c === up ? d : d.toLowerCase();
  }).join("");
  function draw() {
    const k = +sl.value;
    num.textContent = String(k);
    const used = new Set(msg.value.toUpperCase());
    strip.replaceChildren(
      ...[...A].map((c) => h("div", { style: `padding:.15rem 0;border-radius:3px;${used.has(c) ? "background:var(--yellow-soft)" : ""}` }, c)),
      ...[...A].map(() => h("div", { style: "color:var(--ink-3)" }, "↓")),
      ...[...A].map((c, i) => h("div", { style: `padding:.15rem 0;border-radius:3px;color:var(--blue);${used.has(c) ? "background:var(--yellow-soft)" : ""}` }, A[(i + k) % 26])));
    const e = enc(msg.value, k);
    out.textContent = "encrypted: " + e;
    back.textContent = `decrypted with shift ${(26 - k) % 26}: ` + enc(e, (26 - k) % 26);
    note.textContent = `Each letter moves ${k} place${k === 1 ? "" : "s"} along the alphabet, wrapping from Z back to A: position (p + ${k}) % 26. Letters in your message are highlighted. Shifting by 26 - ${k} = ${(26 - k) % 26} undoes it. Spaces and punctuation are left alone.`;
  }
  sl.oninput = draw; msg.oninput = draw;
  draw();
}
