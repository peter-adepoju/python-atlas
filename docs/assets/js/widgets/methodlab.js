// String method lab: pick a method, type a string and arguments, see the result.
// The original string is shown again underneath, unchanged, every time.
import { h } from "../site.js?v=b54d8b61c9";
import { py } from "../runtime.js?v=b54d8b61c9";

const METHODS = [
  ["upper", ""], ["lower", ""], ["title", ""], ["capitalize", ""], ["swapcase", ""],
  ["strip", ""], ["lstrip", ""], ["rstrip", ""], ["strip", "'*'"],
  ["replace", "'a', 'o'"], ["count", "'a'"], ["find", "'a'"], ["index", "'z'"],
  ["startswith", "'Ba'"], ["endswith", "'na'"], ["isalpha", ""], ["isdigit", ""], ["isspace", ""],
  ["center", "20, '*'"], ["ljust", "12, '.'"], ["rjust", "12, '.'"], ["zfill", "8"], ["split", ""], ["split", "'a'"],
];

export default function methodlab(el, { text = "  Banana Bread  ", method = "strip" } = {}) {
  const input = h("input", { class: "w-input", value: text, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "String" });
  const sel = h("select", { class: "w-input", "aria-label": "Method" }, METHODS.map(([m, a], i) => h("option", { value: i }, `.${m}(${a})`)));
  sel.value = String(Math.max(0, METHODS.findIndex(([m]) => m === method)));
  const args = h("input", { class: "w-input", spellcheck: "false", style: "width:11em", "aria-label": "Arguments" });
  const call = h("div", { style: "font:600 1.05rem var(--f-code);margin-top:.8rem;word-break:break-all" });
  const result = h("div", { class: "w-out", style: "margin-top:.4rem;white-space:pre" });
  const orig = h("div", { style: "margin-top:.5rem;font-size:.92rem;color:var(--ink-2)" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "s ="), input),
    h("div", { class: "w-row", style: "margin-top:.5rem" }, h("span", { class: "w-label" }, "method"), sel, h("span", { class: "w-label" }, "arguments"), args),
    call, result, orig, note);

  const show = (s) => s.replace(/ /g, "·");
  let t;
  async function go() {
    const lit = JSON.stringify(input.value);
    const m = METHODS[+sel.value][0];
    const expr = `${lit}.${m}(${args.value})`;
    call.textContent = `s.${m}(${args.value})`;
    const r = await py.eval(expr);
    const tp = await py.eval(`type(${expr}).__name__`, true);
    if (r.error) { result.replaceChildren(h("span", { class: "w-err" }, r.error)); note.textContent = m === "index" ? "index() raises an error when the text isn't there; find() returns -1 instead." : ""; }
    else { result.textContent = show(r.value); note.textContent = `Returns a ${tp.value}.` + (tp.value === "str" ? " A new string: methods never change the original." : tp.value === "list" ? " A list of strings: you'll learn all about lists in Week 8." : ""); }
    orig.replaceChildren("s is still ", h("code", {}, show(JSON.stringify(input.value).replace(/^"|"$/g, "'"))), ". (Spaces are shown as · so you can see them.)");
  }
  sel.onchange = () => { args.value = METHODS[+sel.value][1]; go(); };
  [input, args].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 250); }));
  args.value = METHODS[+sel.value][1];
  go();
}
