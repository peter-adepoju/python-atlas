// Build an f-string format spec with controls and see Python's exact output, padding made visible.
import { h } from "../site.js?v=588dc67651";
import { py } from "../runtime.js?v=588dc67651";

export default function fstringlab(el, { value = "3.14159", name = "pi" } = {}) {
  const vIn = h("input", { class: "w-input", value, spellcheck: "false", style: "width:9em", "aria-label": "Value" });
  const sel = (label, opts) => h("label", { class: "w-label", style: "display:grid;gap:.2rem" }, label, h("select", { class: "w-input" }, opts.map(([v, t]) => h("option", { value: v }, t))));
  const fill = h("input", { class: "w-input", maxlength: 1, style: "width:3em;text-align:center", placeholder: " ", "aria-label": "Fill character" });
  const align = sel("align", [["", "default"], ["<", "< left"], ["^", "^ centre"], [">", "> right"]]);
  const width = h("input", { type: "number", min: 0, max: 30, class: "w-input", value: 16, style: "width:5em", "aria-label": "Width" });
  const comma = sel("thousands", [["", "none"], [",", ", commas"], ["_", "_ underscores"]]);
  const prec = h("input", { type: "number", min: 0, max: 10, class: "w-input", value: 2, style: "width:5em", "aria-label": "Precision" });
  const kind = sel("type", [["f", "f fixed decimals"], ["", "default"], ["e", "e scientific"], ["%", "% percent"], ["d", "d whole number"], ["s", "s text"]]);
  const code = h("div", { style: "font:600 1.15rem var(--f-code);margin-top:.8rem" });
  const out = h("div", { style: "display:inline-flex;margin-top:.4rem;font:600 1.2rem var(--f-code)" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, `${name} =`), vIn),
    h("div", { class: "w-row", style: "margin-top:.6rem;align-items:end" },
      h("label", { class: "w-label", style: "display:grid;gap:.2rem" }, "fill", fill), align,
      h("label", { class: "w-label", style: "display:grid;gap:.2rem" }, "width", width), comma,
      h("label", { class: "w-label", style: "display:grid;gap:.2rem" }, ".precision", prec), kind),
    code, out, note);
  async function go() {
    const a = align.querySelector("select").value, k = kind.querySelector("select").value;
    const f = fill.value && a ? fill.value : "";
    const p = prec.value !== "" && "fe%".includes(k) && k ? "." + prec.value : (k === "" && prec.value !== "" ? "." + prec.value : "");
    const spec = `${f}${a}${width.value || ""}${comma.querySelector("select").value}${p}${k}`;
    code.textContent = `f"{${name}:${spec}}"`;
    const r = await py.eval(`format(${vIn.value}, ${JSON.stringify(spec)})`, true);
    if (r.error) { out.replaceChildren(h("span", { class: "w-err" }, r.error)); note.textContent = "Some combinations don't make sense: 'd' needs a whole number, 's' needs text, and precision doesn't apply to 'd'."; return; }
    out.replaceChildren(...[...r.value].map((ch) => h("span", { style: `display:inline-block;min-width:.62em;text-align:center;border-bottom:2px solid ${ch === " " || ch === f ? "var(--yellow)" : "var(--blue)"};margin-right:1px` }, ch === " " ? " " : ch)));
    note.textContent = `${r.value.length} characters wide. Yellow underlines mark padding, blue the value itself. The part after the colon is the format spec: fill, align, width, thousands, .precision, type, in that order.`;
  }
  el.querySelectorAll("input, select").forEach((x) => x.addEventListener("input", go));
  go();
}
