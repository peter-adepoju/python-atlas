// // and %: sharing things into groups, and the number line for negatives.
import { h, svg } from "../site.js?v=871ff52039";

const fd = (a, b) => Math.floor(a / b);
const md = (a, b) => a - b * Math.floor(a / b);

export default function divmod(el, { a = 17, b = 5 } = {}) {
  let A = a, B = b;
  const ia = h("input", { type: "number", class: "w-input", value: A, style: "width:6em", "aria-label": "a" });
  const ib = h("input", { type: "number", class: "w-input", value: B, style: "width:6em", "aria-label": "b" });
  const s = svg("svg", { class: "w-svg", role: "img", "aria-label": "Groups and leftovers" });
  const eq = h("div", { style: "font:600 1.05rem var(--f-code);margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.4rem 1.6rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "a ="), ia, h("code", {}, "b ="), ib,
    ...[[17, 5], [20, 4], [3, 7], [-17, 5], [17, -5]].map(([x, y]) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { ia.value = x; ib.value = y; read(); } }, `${x}, ${y}`))),
  s, eq, note);

  function draw() {
    s.replaceChildren();
    if (!B) { eq.replaceChildren("b can't be 0: ZeroDivisionError"); note.textContent = ""; s.setAttribute("viewBox", "0 0 640 20"); return; }
    const q = fd(A, B), r = md(A, B);
    eq.replaceChildren(h("span", {}, `${A} // ${B} = ${q}`), h("span", {}, `${A} % ${B} = ${r}`), h("span", { class: "muted" }, `check: ${B} * ${q} + ${r} = ${B * q + r}`));
    if (A >= 0 && B > 0 && A <= 60) {
      // Dots in groups.
      const per = 20, perRow = Math.max(B, 1);
      const groups = q, rows = groups + (r ? 1 : 0);
      const H = 40 + rows * 34;
      s.setAttribute("viewBox", `0 0 640 ${H}`);
      s.append(svg("text", { x: 10, y: 20, class: "dim", "font-size": 13, text: `${A} dots shared into groups of ${B}:` }));
      for (let g = 0; g < rows; g++) {
        const full = g < groups;
        const n = full ? B : r;
        const y = 40 + g * 34;
        s.append(svg("text", { x: 10, y: y + 15, "font-size": 12, class: "dim", text: full ? `group ${g + 1}` : "left over" }));
        for (let k = 0; k < n; k++) s.append(svg("circle", { cx: 100 + (k % perRow) * per, cy: y + 10, r: 7, fill: full ? "var(--blue)" : "var(--yellow)", stroke: full ? "none" : "#c99a0b" }));
      }
      note.textContent = `${q} full groups (that's a // b) and ${r} left over (that's a % b).`;
      return;
    }
    // Number line view.
    const lo = Math.min(0, A, B * q) - Math.abs(B), hi = Math.max(0, A, B * q) + Math.abs(B);
    const W = 640, X = (v) => 20 + ((v - lo) / (hi - lo)) * (W - 40);
    s.setAttribute("viewBox", `0 0 ${W} 130`);
    s.append(svg("line", { x1: 20, y1: 80, x2: W - 20, y2: 80, stroke: "var(--ink-3)" }));
    for (let v = Math.ceil(lo); v <= hi; v++) {
      if ((hi - lo) > 40 && v % 5) continue;
      s.append(svg("line", { x1: X(v), y1: 76, x2: X(v), y2: 84, stroke: "var(--ink-3)" }));
      s.append(svg("text", { x: X(v), y: 100, "text-anchor": "middle", "font-size": 10, class: "dim", text: v }));
    }
    const steps = Math.abs(q);
    for (let k = 0; k < steps; k++) {
      const from = B * Math.sign(q) * k, to = B * Math.sign(q) * (k + 1);
      s.append(svg("path", { d: `M${X(from)},78 Q${(X(from) + X(to)) / 2},${40} ${X(to)},78`, fill: "none", stroke: "var(--blue)", "stroke-width": 2 }));
    }
    s.append(svg("circle", { cx: X(A), cy: 80, r: 6, fill: "var(--yellow)", stroke: "#c99a0b" }));
    s.append(svg("text", { x: X(A), y: 120, "text-anchor": "middle", "font-size": 12, text: `a = ${A}` }));
    s.append(svg("circle", { cx: X(B * q), cy: 80, r: 5, fill: "var(--blue)" }));
    s.append(svg("text", { x: X(B * q), y: 30, "text-anchor": "middle", "font-size": 12, text: `${B} * ${q} = ${B * q}` }));
    note.textContent = `Python takes ${Math.abs(q)} jump(s) of ${B} from 0 and stops at the last multiple of ${B} that is not past a in the "rounding down" direction (${B * q}). The remainder is the gap from there to a: ${r}. With a positive b, the remainder is never negative.`;
  }
  const read = () => { A = parseInt(ia.value || "0", 10); B = parseInt(ib.value || "0", 10); draw(); };
  ia.oninput = read; ib.oninput = read;
  draw();
}
