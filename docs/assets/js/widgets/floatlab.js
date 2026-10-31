// What a float really stores: the exact binary value behind a decimal you typed.
import { h } from "../site.js?v=0064081c78";
import { py } from "../runtime.js?v=0064081c78";

export default function floatlab(el, { start = "0.1" } = {}) {
  const input = h("input", { class: "w-input", value: start, spellcheck: "false", style: "width:10em;font-size:1.1rem", "aria-label": "A decimal number" });
  const out = h("div", { style: "display:grid;gap:.5rem;margin-top:.6rem" });
  const sum = h("div", { class: "panel", style: "margin-top:.8rem" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Type a decimal"), input,
    ...["0.1", "0.5", "0.25", "0.3", "2.675", "1e16", "123.456"].map((x) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { input.value = x; go(); } }, x))), out, sum);
  const row = (label, value, note) => h("div", { class: "panel", style: "padding:.55rem .8rem" },
    h("div", { class: "w-label" }, label), h("div", { style: "font:600 .98rem var(--f-code);word-break:break-all" }, value), note ? h("div", { class: "muted", style: "font-size:.9rem" }, note) : "");
  let t;
  async function go() {
    const r = await py.call("float_info", input.value);
    if (r.error) { out.replaceChildren(h("span", { class: "w-err" }, r.error)); return; }
    const frac = r.binary_frac;
    out.replaceChildren(
      row("Python shows", r.repr, "Python prints the shortest decimal that turns back into the same float."),
      row("What is really stored (exactly)", r.exact, r.exact_equal ? "Exact! This number is a sum of powers of 2, so binary can store it perfectly." : "Not exactly what you typed: binary can't represent it, so Python stores the nearest value it can."),
      row("In binary", `${r.binary_int}.${frac}${frac.length >= 60 ? "…" : ""}`, frac.length >= 55 ? "The pattern goes on forever, like 1/3 = 0.333… in decimal. It gets cut off after 52 binary digits." : "It ends, which is why this one is exact."),
      row("Error", r.diff === "0" ? "0" : r.diff, r.diff === "0" ? "" : "Tiny, but it can add up, and it makes == between floats unreliable."));
  }
  async function sums() {
    const a = await py.eval("0.1 + 0.2", true);
    const b = await py.eval("0.1 + 0.2 == 0.3", true);
    const c = await py.eval("abs((0.1 + 0.2) - 0.3) < 1e-9", true);
    const d = await py.eval("__import__('math').isclose(0.1 + 0.2, 0.3)", true);
    sum.replaceChildren(h("div", { class: "w-label" }, "The famous one"),
      h("div", { style: "font-family:var(--f-code);display:grid;gap:.2rem" },
        h("div", {}, `0.1 + 0.2          →  ${a.value}`),
        h("div", {}, `0.1 + 0.2 == 0.3   →  ${b.value}`),
        h("div", {}, `abs((0.1 + 0.2) - 0.3) < 1e-9  →  ${c.value}`),
        h("div", {}, `math.isclose(0.1 + 0.2, 0.3)  →  ${d.value}`)),
      h("p", { class: "w-note" }, "Compare floats with a tolerance, never with ==. For money, count in whole pennies (ints) or use the decimal module."));
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 300); });
  go(); sums();
}
