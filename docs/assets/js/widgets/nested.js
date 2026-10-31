// Nested loops as a grid: the outer loop picks the row, the inner loop walks across it.
// Step through and watch the order in which the cells are visited.
import { h, reducedMotion } from "../site.js?v=db382219e3";

export default function nested(el, { rows = 3, cols = 4, outer = "i", inner = "j", body = "print(i, j)", triangle = false } = {}) {
  const ir = h("input", { type: "number", min: 1, max: 9, class: "w-input", value: rows, style: "width:4.5em", "aria-label": "rows" });
  const ic = h("input", { type: "number", min: 1, max: 12, class: "w-input", value: cols, style: "width:4.5em", "aria-label": "columns" });
  const tri = h("input", { type: "checkbox" });
  tri.checked = triangle;
  const code = h("pre", { class: "w-out", style: "margin:.7rem 0 0;line-height:1.7" });
  const grid = h("div", { style: "display:grid;gap:4px;margin-top:.7rem;width:max-content;max-width:100%" });
  const step = h("button", { type: "button", class: "btn btn-step" }, "Step");
  const play = h("button", { type: "button", class: "btn btn-quiet" }, "Play");
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Reset");
  const state = h("div", { style: "font:600 1rem var(--f-code);margin-top:.5rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "outer range"), ir, h("code", {}, "inner range"), ic,
    h("label", { class: "w-label", style: "display:flex;gap:.35rem;align-items:center" }, tri, `inner loop depends on ${outer}`)),
  h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;align-items:start" }, code, h("div", {}, grid, state)),
  h("div", { class: "w-row", style: "margin-top:.6rem" }, step, play, reset), note);

  let order = [], k = 0, timer = null;
  function build() {
    const R = Math.max(1, Math.min(9, +ir.value || 1)), C = Math.max(1, Math.min(12, +ic.value || 1));
    const t = tri.checked;
    code.textContent = `for ${outer} in range(${R}):\n    for ${inner} in range(${t ? outer + " + 1" : C}):\n        ${body}`;
    order = [];
    for (let i = 0; i < R; i++) for (let j = 0; j < (t ? i + 1 : C); j++) order.push([i, j]);
    grid.style.gridTemplateColumns = `2.2em repeat(${t ? R : C}, 2.4em)`;
    k = 0;
    draw();
  }
  function draw() {
    const R = Math.max(1, Math.min(9, +ir.value || 1)), C = tri.checked ? R : Math.max(1, Math.min(12, +ic.value || 1));
    const cells = [h("span", {})];
    for (let j = 0; j < C; j++) cells.push(h("span", { style: "text-align:center;font:600 .75rem var(--f-code);color:var(--ink-3)" }, `${inner}=${j}`));
    const done = new Map(order.slice(0, k).map(([i, j], n) => [`${i},${j}`, n + 1]));
    const cur = k ? order[k - 1] : null;
    const valid = new Set(order.map(([i, j]) => `${i},${j}`));
    for (let i = 0; i < R; i++) {
      cells.push(h("span", { style: `font:600 .75rem var(--f-code);align-self:center;color:${cur && cur[0] === i ? "var(--ink)" : "var(--ink-3)"}` }, `${outer}=${i}`));
      for (let j = 0; j < C; j++) {
        const key = `${i},${j}`;
        const n = done.get(key);
        const isCur = cur && cur[0] === i && cur[1] === j;
        cells.push(h("span", {
          style: `height:2.4em;display:grid;place-items:center;border-radius:5px;font:600 .8rem var(--f-code);` +
            (!valid.has(key) ? "border:1px dashed var(--line);opacity:.4" :
              isCur ? "background:var(--yellow);color:#16213a" : n ? "background:var(--blue-soft);border:1px solid var(--blue)" : "border:1px solid var(--line)"),
        }, n ? String(n) : ""));
      }
    }
    grid.replaceChildren(...cells);
    state.textContent = cur ? `${outer} = ${cur[0]}, ${inner} = ${cur[1]}   (run ${k} of ${order.length})` : `The body will run ${order.length} times.`;
    note.textContent = k === order.length && k
      ? (tri.checked ? `Done. Row ${outer} has ${outer} + 1 cells, so the total is 1 + 2 + ... + ${Math.max(1, +ir.value)} = ${order.length}.` : `Done: ${Math.max(1, +ir.value)} rows times ${C} columns is ${order.length} runs of the body. The inner loop finishes completely before the outer loop moves on.`)
      : "The numbers show the order the cells are visited. The inner variable changes fastest; the outer one only changes when the inner loop has finished.";
    step.disabled = k >= order.length;
  }
  const stopPlay = () => { clearInterval(timer); timer = null; play.textContent = "Play"; };
  step.onclick = () => { stopPlay(); k = Math.min(order.length, k + 1); draw(); };
  play.onclick = () => {
    if (timer) return stopPlay();
    if (k >= order.length) k = 0;
    play.textContent = "Pause";
    timer = setInterval(() => { if (k >= order.length) return stopPlay(); k++; draw(); }, reducedMotion() ? 600 : 280);
  };
  reset.onclick = () => { stopPlay(); k = 0; draw(); };
  [ir, ic, tri].forEach((x) => x.addEventListener("input", () => { stopPlay(); build(); }));
  build();
}
