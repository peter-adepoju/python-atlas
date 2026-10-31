// Loop counter: pick a loop shape, see how many times its body runs for n = 8, 16, 32, ...
// and what happens to the count each time n doubles.
import { h } from "../site.js?v=db382219e3";

const PRESETS = {
  single: { code: "for i in range(n):\n    body()", f: n => n, cls: "O(n)" },
  step3: { code: "for i in range(0, n, 3):\n    body()", f: n => Math.ceil(n / 3), cls: "O(n)" },
  double: { code: "i = 1\nwhile i < n:\n    body()\n    i *= 2", f: n => { let c = 0; for (let i = 1; i < n; i *= 2) c++; return c; }, cls: "O(log n)" },
  square: { code: "for i in range(n):\n    for j in range(n):\n        body()", f: n => n * n, cls: "O(n²)" },
  triangle: { code: "for i in range(n):\n    for j in range(i):\n        body()", f: n => n * (n - 1) / 2, cls: "O(n²)" },
  inner_const: { code: "for i in range(n):\n    for j in range(10):\n        body()", f: n => 10 * n, cls: "O(n)" },
  inner_log: { code: "for i in range(n):\n    j = 1\n    while j < n:\n        body()\n        j *= 2", f: n => { let c = 0; for (let j = 1; j < n; j *= 2) c++; return n * c; }, cls: "O(n log n)" },
  seq: { code: "for i in range(n):\n    body()\nfor j in range(n):\n    body()", f: n => 2 * n, cls: "O(n)" },
  two_ptr: { code: "lo, hi = 0, n - 1\nwhile lo < hi:\n    body()\n    if lo % 2 == 0:\n        lo += 1\n    else:\n        hi -= 1", f: n => Math.max(0, n - 1), cls: "O(n)" },
  sqrt: { code: "i = 1\nwhile i * i <= n:\n    body()\n    i += 1", f: n => Math.floor(Math.sqrt(n)), cls: "O(√n)" },
  cube: { code: "for i in range(n):\n    for j in range(n):\n        for k in range(n):\n            body()", f: n => n ** 3, cls: "O(n³)" },
};

export default function loopcount(el, { presets = Object.keys(PRESETS), sizes = [8, 16, 32, 64, 128, 256, 512, 1024] } = {}) {
  let cur = presets[0], shown = false;
  const tabs = h("div", { class: "w-row", style: "flex-wrap:wrap;gap:.35rem" });
  const code = h("pre", { class: "w-out", style: "margin-top:.6rem;white-space:pre;overflow-x:auto" });
  const table = h("table", { style: "margin-top:.6rem;border-collapse:collapse;font:600 .85rem var(--f-code);width:100%;max-width:30rem" });
  const reveal = h("button", { type: "button", class: "btn btn-step" }, "Show the class");
  const verdict = h("p", { class: "w-note", style: "font-weight:600" });
  el.append(tabs, code, table, h("div", { class: "w-row", style: "margin-top:.5rem" }, reveal), verdict);
  function draw() {
    tabs.replaceChildren(...presets.map((k, i) => {
      const b = h("button", { type: "button", class: "btn " + (k === cur ? "btn-step" : "btn-quiet"), style: "padding:.25rem .6rem" }, `Loop ${i + 1}`);
      b.onclick = () => { cur = k; shown = false; draw(); };
      return b;
    }));
    const p = PRESETS[cur];
    code.textContent = p.code;
    const cell = "padding:.25rem .5rem;border-bottom:1px solid var(--line);text-align:right";
    const rows = sizes.map((n, i) => {
      const c = p.f(n), prev = i > 0 && sizes[i - 1] * 2 === n ? p.f(sizes[i - 1]) : null;
      return h("tr", {}, h("td", { style: cell }, n.toLocaleString("en-GB")), h("td", { style: cell }, Math.round(c).toLocaleString("en-GB")),
        h("td", { style: cell + ";color:var(--ink-3)" }, prev ? `×${(c / prev).toFixed(2)}` : ""));
    });
    table.replaceChildren(h("tr", {}, ...["n", "body runs", "after doubling n"].map(t => h("th", { style: "padding:.25rem .5rem;text-align:right;border-bottom:2px solid var(--line);font-family:var(--f-body)" }, t))), ...rows);
    verdict.textContent = shown ? `This loop is ${p.cls}.` : "Work out the class from the counts and the ratios, then check.";
    reveal.textContent = shown ? "Hide" : "Show the class";
  }
  reveal.onclick = () => { shown = !shown; draw(); };
  draw();
}
