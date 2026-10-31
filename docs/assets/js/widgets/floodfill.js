// Flood fill: click a square to start filling. The recursive fill visits squares in the order
// shown, with the call stack beside it; walls (#) stop it.
import { h } from "../site.js?v=055c40ee42";

export default function floodfill(el, { grid = [
  "..........",
  ".####.....",
  ".#..#..##.",
  ".#..#..#..",
  ".####..#..",
  "......##..",
  "###.......",
  "..#..####.",
  "..#..#..#.",
  "..#..####.",
], start = [0, 0] } = {}) {
  const rows = grid.length, cols = grid[0].length;
  let origin = start, order = [], stacks = [], step = 0, diag = false;
  const box = h("div", { style: `display:grid;grid-template-columns:repeat(${cols},minmax(0,1.9rem));gap:2px;margin-top:.6rem;max-width:100%` });
  const info = h("div", { style: "margin-top:.6rem;font:600 .95rem var(--f-code)" });
  const stackOut = h("div", { class: "w-out", style: "margin-top:.4rem;white-space:pre-wrap;max-height:9rem;overflow:auto" });
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const fwd = h("button", { type: "button", class: "btn btn-step" }, "Next square");
  const all = h("button", { type: "button", class: "btn btn-quiet" }, "Fill it all");
  const dg = h("input", { type: "checkbox", "aria-label": "Include diagonals" });
  el.append(h("div", { class: "w-row", style: "align-items:center;flex-wrap:wrap" }, back, fwd, all,
    h("label", { class: "w-label", style: "display:inline-flex;gap:.3rem;align-items:center" }, dg, "diagonals count as neighbours")),
    box, info, stackOut, h("p", { class: "w-note" }, "Click any open square to start the fill from there."));

  function run() {
    order = []; stacks = [];
    const seen = new Set(), stack = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].concat(diag ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : []);
    (function fill(r, c) {
      if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === "#" || seen.has(r * cols + c)) return;
      seen.add(r * cols + c); stack.push([r, c]);
      order.push([r, c]); stacks.push(stack.slice());
      for (const [dr, dc] of dirs) fill(r + dr, c + dc);
      stack.pop();
    })(origin[0], origin[1]);
    step = Math.min(1, order.length);
  }
  function draw() {
    back.disabled = step <= 1; fwd.disabled = step >= order.length; all.disabled = step >= order.length;
    const when = new Map(order.slice(0, step).map(([r, c], i) => [r * cols + c, i + 1]));
    const cur = order[step - 1];
    box.replaceChildren(...grid.flatMap((line, r) => [...line].map((ch, c) => {
      const n = when.get(r * cols + c), here = cur && cur[0] === r && cur[1] === c;
      const b = h("button", { type: "button", "aria-label": `row ${r}, column ${c}`, style: `aspect-ratio:1;border:1px solid var(--line);border-radius:3px;padding:0;font:600 .62rem var(--f-code);cursor:${ch === "#" ? "default" : "pointer"};background:${ch === "#" ? "var(--ink-2)" : here ? "var(--green)" : n ? "var(--blue-soft)" : "var(--paper)"};color:${here ? "var(--paper)" : "var(--ink-2)"}` }, n || "");
      if (ch !== "#") b.onclick = () => { origin = [r, c]; run(); draw(); };
      return b;
    })));
    info.textContent = cur ? `square ${step} of ${order.length} filled:  row ${cur[0]}, column ${cur[1]}` : "That square is a wall.";
    stackOut.textContent = cur ? "calls still open (most recent last):\n" + stacks[step - 1].map(([r, c], i) => `${"  ".repeat(Math.min(i, 12))}fill(${r}, ${c})`).join("\n") : "";
    stackOut.scrollTop = stackOut.scrollHeight;
  }
  back.onclick = () => { step--; draw(); };
  fwd.onclick = () => { step++; draw(); };
  all.onclick = () => { step = order.length; draw(); };
  dg.onchange = () => { diag = dg.checked; run(); draw(); };
  run(); draw();
}
