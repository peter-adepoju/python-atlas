// print() with sep and end: see every space and newline it writes.
import { h } from "../site.js?v=055c40ee42";
import { py } from "../runtime.js?v=055c40ee42";

export default function printlab(el, { values = "'Ada', 36, 'London'", sep = "", end = "" } = {}) {
  const vIn = h("input", { class: "w-input", value: values, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "Values to print" });
  const sIn = h("input", { class: "w-input", value: sep, placeholder: "default ' '", spellcheck: "false", style: "width:8em", "aria-label": "sep" });
  const eIn = h("input", { class: "w-input", value: end, placeholder: "default '\\n'", spellcheck: "false", style: "width:8em", "aria-label": "end" });
  const code = h("pre", { class: "w-out", style: "margin-top:.6rem" });
  const visible = h("div", { style: "font:600 1.1rem var(--f-code);padding:.6rem .8rem;border:1px dashed var(--line);border-radius:6px;margin-top:.5rem;white-space:pre-wrap" });
  const note = h("p", { class: "w-note" }, "Grey dots are spaces and ↵ is a new line: characters you normally can't see. Try sep='' or sep=', ' or end=''.");
  el.append(h("div", { class: "w-row" }, h("code", {}, "print("), vIn, h("code", {}, ")")),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, h("code", {}, "sep ="), sIn, h("code", {}, "end ="), eIn,
      h("span", { class: "muted", style: "font-size:.85rem" }, "(type them as Python strings, e.g. ', ' with quotes)")),
    code, h("div", { class: "w-label", style: "margin-top:.6rem" }, "Exactly what gets written"), visible, note);
  async function go() {
    const args = [vIn.value.trim()];
    if (sIn.value.trim()) args.push("sep=" + sIn.value.trim());
    if (eIn.value.trim()) args.push("end=" + eIn.value.trim());
    const src = `print(${args.filter(Boolean).join(", ")})\nprint("(next print starts here)")`;
    code.textContent = src;
    const r = await py.run(src);
    if (r.error) { visible.replaceChildren(h("span", { class: "w-err" }, `${r.error.type}: ${r.error.message}`)); return; }
    const parts = [];
    for (const ch of r.output) {
      if (ch === " ") parts.push(h("span", { style: "color:var(--ink-3)" }, "·"));
      else if (ch === "\n") parts.push(h("span", { style: "color:#c99a0b" }, "↵"), "\n");
      else parts.push(ch);
    }
    visible.replaceChildren(...parts);
  }
  [vIn, sIn, eIn].forEach((x) => x.addEventListener("input", go));
  go();
}
