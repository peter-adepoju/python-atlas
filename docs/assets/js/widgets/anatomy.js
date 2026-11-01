// Anatomy of a line of code: click each part to see what it is.
// params: {code: "print('Hi', name)", parts: [{text: "print", label: "function name", explain: "..."}]}
import { h } from "../site.js?v=871ff52039";
import { py } from "../runtime.js?v=871ff52039";

export default function anatomy(el, { code, parts = [], run = true, inputs = [] }) {
  const line = h("div", { style: "font:600 1.25rem/1.9 var(--f-code);padding:.6rem .8rem;background:var(--code-bg);border:1px solid var(--line);border-radius:6px;white-space:pre-wrap;overflow-x:auto" });
  const label = h("div", { style: "font:700 1rem var(--f-head);margin-top:.7rem;min-height:1.3em" });
  const note = h("p", { class: "w-note", "aria-live": "polite" }, "Click a highlighted part.");
  let pos = 0;
  const buttons = [];
  for (const p of parts) {
    const at = code.indexOf(p.text, pos);
    if (at < 0) continue;
    if (at > pos) line.append(code.slice(pos, at));
    const b = h("button", { type: "button", style: "all:unset;cursor:pointer;border-radius:4px;padding:0 .1em;border-bottom:3px solid var(--blue)" }, p.text);
    b.onclick = () => {
      buttons.forEach((x) => { x.style.background = ""; });
      b.style.background = "var(--yellow-soft)";
      label.textContent = p.label;
      note.textContent = p.explain;
    };
    buttons.push(b);
    line.append(b);
    pos = at + p.text.length;
  }
  line.append(code.slice(pos));
  el.append(line, label, note);
  if (run) {
    const out = h("pre", { class: "w-out", hidden: true });
    const btn = h("button", { type: "button", class: "btn btn-run" }, "Run it");
    btn.onclick = async () => {
      const r = await py.run(code, { inputs });
      out.hidden = false;
      out.textContent = (r.output || "") + (r.error ? r.error.type + ": " + r.error.message : "");
    };
    el.append(h("div", { class: "w-row", style: "margin-top:.4rem" }, btn), out);
  }
}
