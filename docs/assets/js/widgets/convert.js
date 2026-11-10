// The conversion machine: feed a value in, pick int/float/str/bool, see what comes out.
import { h } from "../site.js?v=b54d8b61c9";
import { py } from "../runtime.js?v=b54d8b61c9";

export default function convert(el, { start = "'42'", tries = ["'42'", "'3.7'", "3.7", "'seven'", "' 12 '", "True", "0", "''", "'0'", "'1e3'", "-2.9"] }) {
  const input = h("input", { class: "w-input", value: start, spellcheck: "false", style: "width:9em;font-size:1.05rem", "aria-label": "Value to convert (as Python code)" });
  const grid = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin-top:.7rem" });
  const note = h("p", { class: "w-note" }, "Strings need quotes here, just as in Python. Errors are part of the lesson: read them.");
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Value in"), input),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, tries.map((x) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { input.value = x; go(); } }, x))),
    grid, note);
  let t;
  async function go() {
    const v = input.value.trim();
    const typ = await py.eval(`type(${v}).__name__`, true);
    const cells = [h("div", { class: "panel", style: "padding:.55rem .7rem;border-color:var(--yellow)" },
      h("div", { class: "w-label" }, "going in"), h("div", { style: "font:600 1rem var(--f-code)" }, typ.error ? "-" : v), h("div", { class: "muted", style: "font-size:.85rem" }, typ.error ? typ.error : `type: ${typ.value}`))];
    for (const f of ["int", "float", "str", "bool"]) {
      const r = await py.eval(`repr(${f}(${v}))`, true);
      cells.push(h("div", { class: "panel", style: `padding:.55rem .7rem;${r.error ? "border-color:var(--red);background:var(--red-soft)" : ""}` },
        h("div", { class: "w-label" }, `${f}(${v})`),
        h("div", { style: "font:600 1rem var(--f-code);word-break:break-all" }, r.error ? r.error.split(":")[0] : r.value),
        r.error ? h("div", { style: "font-size:.82rem" }, r.error.split(": ").slice(1).join(": ")) : ""));
    }
    grid.replaceChildren(...cells);
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 350); });
  go();
}
