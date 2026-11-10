// Growth rates: how many steps each kind of algorithm takes as n grows, and roughly how long
// that would take in Python. Doubling n shows the pattern that names each class.
import { h } from "../site.js?v=db5173407e";

const CURVES = {
  "1": { name: "constant, O(1)", f: () => 1, eg: "look up a list item by index" },
  log: { name: "logarithmic, O(log n)", f: n => Math.max(1, Math.ceil(Math.log2(n))), eg: "binary search" },
  n: { name: "linear, O(n)", f: n => n, eg: "go through a list once" },
  nlogn: { name: "n log n, O(n log n)", f: n => n * Math.max(1, Math.ceil(Math.log2(n))), eg: "merge sort, sorted()" },
  n2: { name: "quadratic, O(n²)", f: n => n * n, eg: "compare every pair" },
  n3: { name: "cubic, O(n³)", f: n => n ** 3, eg: "every triple" },
  "2n": { name: "exponential, O(2ⁿ)", f: n => 2 ** n, eg: "try every subset" },
};
const RATE = 1e7; // simple Python steps per second, roughly

function fmt(x) {
  if (!isFinite(x) || x > 1e300) return "astronomical";
  if (x < 1e6) return Math.round(x).toLocaleString("en-GB");
  const e = Math.floor(Math.log10(x));
  return `${(x / 10 ** e).toFixed(1)} × 10^${e}`;
}
function dur(steps) {
  const s = steps / RATE;
  if (!isFinite(s) || s > 1e300) return "longer than the universe has existed";
  if (s < 1e-3) return "under a millisecond";
  if (s < 1) return `about ${Math.round(s * 1000)} ms`;
  if (s < 120) return `about ${s.toFixed(1)} seconds`;
  if (s < 7200) return `about ${Math.round(s / 60)} minutes`;
  if (s < 172800) return `about ${Math.round(s / 3600)} hours`;
  if (s < 3.15e7 * 2) return `about ${Math.round(s / 86400)} days`;
  const y = s / 3.15e7;
  return y > 1.4e10 ? "longer than the universe has existed" : `about ${fmt(y)} years`;
}

export default function growth(el, { curves = ["1", "log", "n", "nlogn", "n2", "2n"], n = 16, sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 1000, 10000, 100000, 1000000], bigO = true } = {}) {
  let i = Math.max(0, sizes.indexOf(n)); if (sizes.indexOf(n) < 0) i = 4;
  const lab = h("span", { class: "w-label", style: "min-width:7rem" });
  const sl = h("input", { type: "range", min: 0, max: sizes.length - 1, value: i, "aria-label": "Input size n" });
  const dbl = h("button", { type: "button", class: "btn btn-step" }, "Double n");
  const list = h("div", { style: "display:grid;gap:.55rem;margin-top:.7rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row", style: "align-items:center;flex-wrap:wrap" }, lab, sl, dbl), list, note);
  let prevN = null;
  function draw() {
    const N = sizes[i];
    lab.textContent = `n = ${N.toLocaleString("en-GB")}`;
    const vals = curves.map(k => CURVES[k].f(N));
    const top = Math.log10(Math.max(...vals.filter(isFinite), 10)) + 0.3;
    list.replaceChildren(...curves.map((k, j) => {
      const c = CURVES[k], v = vals[j];
      const w = !isFinite(v) ? 100 : Math.max(1.5, 100 * Math.log10(Math.max(v, 1) + 1) / Math.max(top, 1));
      let ratio = "";
      if (prevN && prevN * 2 === N) {
        const r = v / c.f(prevN);
        ratio = !isFinite(r) ? "" : `  (×${r >= 100 ? fmt(r) : +r.toFixed(2)} after doubling)`;
      }
      return h("div", {},
        h("div", { style: "display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;font-size:.86rem" },
          h("strong", {}, bigO ? c.name : c.name.split(",")[0]), h("span", { style: "color:var(--ink-3)" }, c.eg)),
        h("div", { style: "display:flex;align-items:center;gap:.5rem" },
          h("div", { style: `height:14px;width:${Math.min(w, 100) * 0.6}%;background:var(--blue);border-radius:3px;flex:none` }),
          h("span", { style: "font:600 .82rem var(--f-code)" }, `${fmt(v)} step${v === 1 ? "" : "s"}${ratio}`)),
        h("div", { style: "font-size:.78rem;color:var(--ink-3)" }, dur(v)));
    }));
    note.textContent = "The bars use a log scale, so a bar twice as long stands for vastly more than twice the steps. Times assume about 10 million simple steps a second, a rough figure for Python.";
  }
  sl.oninput = () => { prevN = null; i = +sl.value; draw(); };
  dbl.onclick = () => {
    const N = sizes[i];
    prevN = N;
    const j = sizes.indexOf(N * 2);
    if (j >= 0) i = j; else { sizes = sizes.slice(); sizes.splice(i + 1, 0, N * 2); sl.max = sizes.length - 1; i = i + 1; }
    sl.value = i; draw();
  };
  draw();
}
