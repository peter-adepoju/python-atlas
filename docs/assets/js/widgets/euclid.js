// Euclid's algorithm as geometry: cut the biggest squares you can from an a-by-b rectangle.
// The side of the last square is the greatest common divisor.
import { h, svg } from "../site.js?v=9f26fe5be3";

const COLS = ["var(--blue)", "var(--green)", "var(--violet)", "#c97a1e", "var(--red)", "var(--ink-3)"];

export default function euclid(el, { a = 84, b = 36 } = {}) {
  const ia = h("input", { type: "number", min: 1, max: 999, class: "w-input", value: a, style: "width:6em", "aria-label": "a" });
  const ib = h("input", { type: "number", min: 1, max: 999, class: "w-input", value: b, style: "width:6em", "aria-label": "b" });
  const pic = svg("svg", { class: "w-svg", role: "img", "aria-label": "Rectangle cut into squares" });
  const table = h("div", { style: "overflow-x:auto" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "a ="), ia, h("code", {}, "b ="), ib,
    ...[[84, 36], [21, 13], [100, 75], [17, 5], [48, 18]].map(([x, y]) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { ia.value = x; ib.value = y; draw(); } }, `${x}, ${y}`))),
  h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;align-items:start;margin-top:.8rem" }, pic, table), note);

  function draw() {
    let A = Math.max(1, Math.min(999, parseInt(ia.value || "1", 10)));
    let B = Math.max(1, Math.min(999, parseInt(ib.value || "1", 10)));
    const W = Math.max(A, B), H = Math.min(A, B);
    const scale = 300 / W;
    pic.setAttribute("viewBox", `-2 -2 ${W * scale + 4} ${H * scale + 4}`);
    pic.replaceChildren(svg("rect", { x: 0, y: 0, width: W * scale, height: H * scale, fill: "none", stroke: "var(--ink-3)" }));
    // Cut squares: the rectangle (x, y, w, h) loses squares along its longer side.
    let x = 0, y = 0, w = W, hh = H, step = 0, squares = 0;
    const rows = [];
    let p = A, q = B;
    while (q) { rows.push([p, q, Math.floor(p / q), p % q]); [p, q] = [q, p % q]; }
    while (w > 0 && hh > 0 && squares < 400) {
      const s = Math.min(w, hh);
      const col = COLS[step % COLS.length];
      const n = Math.floor(Math.max(w, hh) / s);
      for (let k = 0; k < n && squares < 400; k++, squares++) {
        const sx = w >= hh ? x + k * s : x, sy = w >= hh ? y : y + k * s;
        pic.append(svg("rect", { x: sx * scale, y: sy * scale, width: s * scale, height: s * scale, fill: col, "fill-opacity": .28, stroke: col, "stroke-width": 1.2 }));
      }
      if (w >= hh) { x += n * s; w -= n * s; } else { y += n * s; hh -= n * s; }
      step++;
    }
    table.replaceChildren(h("table", {}, h("thead", {}, h("tr", {}, ["a", "b", "a // b", "a % b"].map((t) => h("th", { style: "font-family:var(--f-code)" }, t)))),
      h("tbody", {}, rows.map((r, i) => h("tr", {}, r.map((v, j) => h("td", { style: `font-family:var(--f-code);${j === 1 && i === rows.length - 1 ? "font-weight:700;background:var(--yellow-soft)" : ""}` }, String(v))))))));
    const g = rows.length ? rows[rows.length - 1][1] : A;
    note.textContent = `Each colour is one step: cut as many squares as fit, then repeat on the leftover strip. The last squares are ${g} by ${g}, and they tile everything before them exactly, so ${g} divides both numbers: gcd(${A}, ${B}) = ${g}. The table is the same process in arithmetic: a % b is the leftover strip.`;
  }
  ia.oninput = draw; ib.oninput = draw;
  draw();
}
