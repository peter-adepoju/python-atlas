// Every arithmetic operator at once: drag the numbers and watch all the results change.
import { h } from "../site.js?v=97b2d34bb1";

// Python's rules, not JavaScript's: // rounds down, % takes the sign of the divisor.
const pyFloorDiv = (a, b) => Math.floor(a / b);
const pyMod = (a, b) => a - b * Math.floor(a / b);
const fmtFloat = (x) => {
  if (!isFinite(x)) return "-";
  let s = String(x);
  if (Number.isInteger(x)) s = x.toFixed(1);
  return s;
};

const OPS = [
  ["+", "add", (a, b) => String(a + b)],
  ["-", "subtract", (a, b) => String(a - b)],
  ["*", "multiply", (a, b) => String(a * b)],
  ["/", "divide (always gives a float)", (a, b) => (b === 0 ? "ZeroDivisionError" : fmtFloat(a / b))],
  ["//", "floor divide: divide, then round down", (a, b) => (b === 0 ? "ZeroDivisionError" : String(pyFloorDiv(a, b)))],
  ["%", "remainder (modulo)", (a, b) => (b === 0 ? "ZeroDivisionError" : String(pyMod(a, b)))],
  ["**", "power", (a, b) => (b < 0 ? fmtFloat(a ** b) : Math.abs(a ** b) > 1e15 ? BigInt(a) ** BigInt(b) + "" : String(a ** b))],
];

export default function operators(el, { a = 17, b = 5 } = {}) {
  let A = a, B = b;
  const sa = h("input", { type: "range", min: -20, max: 30, value: A, "aria-label": "a", style: "flex:1" });
  const sb = h("input", { type: "range", min: -10, max: 12, value: B, "aria-label": "b", style: "flex:1" });
  const la = h("span", { class: "w-chip" }), lb = h("span", { class: "w-chip" });
  const tbody = h("tbody");
  el.append(
    h("div", { class: "w-row" }, h("span", { class: "w-label", style: "width:1.5em" }, "a"), sa, la),
    h("div", { class: "w-row" }, h("span", { class: "w-label", style: "width:1.5em" }, "b"), sb, lb),
    h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Python"), h("th", {}, "Result"), h("th", {}, "Meaning"))), tbody),
    h("p", { class: "w-note" }, "Try a negative a with // and %. Python always rounds // down (towards minus infinity), so -17 // 5 is -4, not -3."));
  function draw() {
    la.textContent = A; lb.textContent = B;
    tbody.replaceChildren(...OPS.map(([op, meaning, f]) => {
      const r = f(A, B);
      return h("tr", {}, h("td", {}, h("code", {}, `${A} ${op} ${B}`)),
        h("td", {}, h("code", { style: r.includes("Error") ? "color:var(--red)" : "" }, r)),
        h("td", { class: "muted" }, meaning));
    }));
  }
  sa.oninput = () => { A = +sa.value; draw(); };
  sb.oninput = () => { B = +sb.value; draw(); };
  draw();
}
