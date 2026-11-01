// Type anything: Python tells you its type, how it prints, and how much memory it takes.
import { h } from "../site.js?v=8fe38f9496";
import { py } from "../runtime.js?v=8fe38f9496";

const ABOUT = {
  int: "a whole number. Python ints have no size limit: try 2 ** 200.",
  float: "a number with a decimal point, stored in binary with about 16 significant digits.",
  str: "text: a sequence of characters inside quotes.",
  bool: "a truth value: True or False.",
  NoneType: "None, Python's way of saying 'no value here'.",
  complex: "a complex number (a + bj).",
  list: "a list (you'll meet these in Week 8).",
  tuple: "a tuple (Week 9).",
  dict: "a dictionary (Week 10).",
  set: "a set (Week 10).",
};

export default function typeinspect(el, { start = "2 ** 100", examples = ["7", "7.0", "'7'", "True", "2 ** 100", "0.1 + 0.2", "None", "3 / 1"] }) {
  const input = h("input", { class: "w-input", value: start, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "A Python value or expression" });
  const out = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.5rem;margin-top:.6rem" });
  const note = h("p", { class: "w-note", "aria-live": "polite" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Value"), input),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, examples.map((x) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { input.value = x; go(); } }, x))),
    out, note);
  let t;
  async function go() {
    const src = input.value.trim();
    if (!src) return;
    const card = (label, v) => h("div", { class: "panel", style: "padding:.5rem .7rem" }, h("div", { class: "w-label" }, label), h("div", { style: "font:600 1rem var(--f-code);word-break:break-all" }, v));
    const t1 = await py.eval(`type(${src}).__name__`, true);
    if (t1.error) { out.replaceChildren(h("span", { class: "w-err" }, t1.error)); note.textContent = ""; return; }
    const t2 = await py.eval(`repr(${src})`, true);
    const t3 = await py.eval(`__import__('sys').getsizeof(${src})`, true);
    out.replaceChildren(card("type(...)", t1.value), card("Python shows it as", t2.value), card("Bytes of memory", t3.value));
    note.textContent = `${t1.value}: ${ABOUT[t1.value] || "a Python object."}`;
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 350); });
  go();
}
