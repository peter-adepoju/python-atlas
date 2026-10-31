// Two ways to approximate a square root: bisection (halve the interval) and Newton's method
// (average a guess with x / guess). Each row is one step; the bar shows how many digits are right.
import { h } from "../site.js?v=5b063fa476";

export default function approx(el, { x = 2, steps = 12 } = {}) {
  const ix = h("input", { type: "number", min: 0.01, step: "any", class: "w-input", value: x, style: "width:7em", "aria-label": "x" });
  const box = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-top:.8rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Square root of"), ix,
    ...[2, 10, 0.5, 1000000].map((v) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { ix.value = v; draw(); } }, String(v)))), box, note);

  const digits = (err, truth) => {
    if (err === 0) return 16;
    const rel = err / Math.max(1e-300, Math.abs(truth));
    return Math.max(0, Math.min(16, -Math.log10(rel)));
  };
  function panel(title, rows, truth) {
    return h("div", { class: "panel", style: "padding:.6rem .8rem" }, h("div", { class: "w-label" }, title),
      h("table", { style: "margin:.3rem 0 0;width:100%" },
        h("thead", {}, h("tr", {}, h("th", {}, "step"), h("th", {}, "estimate"), h("th", { style: "width:40%" }, "correct digits"))),
        h("tbody", {}, rows.map((v, k) => {
          const d = digits(Math.abs(v - truth), truth);
          return h("tr", {}, h("td", { style: "font-family:var(--f-code)" }, String(k + 1)),
            h("td", { style: "font-family:var(--f-code)" }, v.toPrecision(12)),
            h("td", {}, h("div", { style: `height:.7em;border-radius:3px;background:var(--blue);width:${(d / 16) * 100}%;min-width:2px` })));
        }))));
  }
  function draw() {
    const X = Math.max(0.01, parseFloat(ix.value) || 2);
    const truth = Math.sqrt(X);
    let lo = 0, hi = Math.max(1, X);
    const bis = [];
    for (let k = 0; k < steps; k++) {
      const mid = (lo + hi) / 2;
      bis.push(mid);
      if (mid * mid < X) lo = mid; else hi = mid;
    }
    let g = Math.max(1, X);
    const newt = [];
    for (let k = 0; k < Math.min(steps, 8); k++) { g = (g + X / g) / 2; newt.push(g); }
    box.replaceChildren(panel("Bisection: try the middle, keep the half that contains the answer", bis, truth),
      panel("Newton (Babylonian): average the guess with x / guess", newt, truth));
    note.textContent = `The true value is ${truth.toPrecision(15)}. Bisection gains about one correct digit every 3 or 4 steps, because each step halves the interval. Newton's method roughly doubles the number of correct digits each step once it's close, so it reaches the limit of a float in a handful of steps.`;
  }
  ix.oninput = draw;
  draw();
}
