// A grid (list of lists) drawn as a table of cells with row and column numbers.
// Click a cell to see how to reach it; choose a view to highlight a row, a column,
// a diagonal or a cell's neighbours.
import { h } from "../site.js?v=97b2d34bb1";

export default function gridviz(el, { rows = 4, cols = 5, name = "grid", values = null } = {}) {
  const R = rows, C = cols;
  const val = (r, c) => (values ? values[r][c] : r * C + c);
  let sel = [1, 2];
  let mode = "cell";
  const modes = [["cell", "one cell"], ["row", "its row"], ["col", "its column"], ["diag", "main diagonal"], ["near", "its neighbours"]];
  const pick = h("div", { class: "w-row" }, modes.map(([m, t]) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { mode = m; draw(); } }, t)));
  const table = h("div", { style: "display:grid;gap:3px;margin-top:.7rem;width:max-content;max-width:100%;overflow-x:auto" });
  const code = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap" });
  const note = h("p", { class: "w-note" });
  el.append(pick, table, code, note);

  function inSel(r, c) {
    const [sr, sc] = sel;
    if (mode === "cell") return r === sr && c === sc;
    if (mode === "row") return r === sr;
    if (mode === "col") return c === sc;
    if (mode === "diag") return r === c;
    if (mode === "near") return Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1 && !(r === sr && c === sc);
    return false;
  }
  function draw() {
    table.style.gridTemplateColumns = `2.4em repeat(${C}, 2.6em)`;
    const cells = [h("span", {})];
    for (let c = 0; c < C; c++) cells.push(h("span", { style: "text-align:center;font:600 .72rem var(--f-code);color:var(--ink-3)" }, `c=${c}`));
    for (let r = 0; r < R; r++) {
      cells.push(h("span", { style: "align-self:center;font:600 .72rem var(--f-code);color:var(--ink-3)" }, `r=${r}`));
      for (let c = 0; c < C; c++) {
        const on = inSel(r, c), isSel = r === sel[0] && c === sel[1] && mode !== "diag";
        cells.push(h("button", {
          type: "button", title: `${name}[${r}][${c}]`,
          style: `height:2.4em;border-radius:5px;font:600 .9rem var(--f-code);cursor:pointer;color:var(--ink);border:1px solid ${isSel ? "var(--ink)" : on ? "var(--yellow)" : "var(--line)"};background:${on ? "var(--yellow-soft)" : "var(--surface)"}`,
          onclick: () => { sel = [r, c]; draw(); },
        }, String(val(r, c))));
      }
    }
    table.replaceChildren(...cells);
    const [r, c] = sel;
    const lines = {
      cell: `${name}[${r}][${c}]   # row ${r}, then column ${c}  ->  ${val(r, c)}`,
      row: `${name}[${r}]   # the whole row is one inner list\n# -> [${Array.from({ length: C }, (_, k) => val(r, k)).join(", ")}]`,
      col: `column = []\nfor row in ${name}:\n    column.append(row[${c}])\n# -> [${Array.from({ length: R }, (_, k) => val(k, c)).join(", ")}]`,
      diag: `diagonal = []\nfor i in range(${Math.min(R, C)}):\n    diagonal.append(${name}[i][i])\n# -> [${Array.from({ length: Math.min(R, C) }, (_, k) => val(k, k)).join(", ")}]`,
      near: `for dr in [-1, 0, 1]:\n    for dc in [-1, 0, 1]:\n        nr, nc = ${r} + dr, ${c} + dc\n        if not (dr == 0 and dc == 0) and 0 <= nr < ${R} and 0 <= nc < ${C}:\n            ...  # ${name}[nr][nc] is a neighbour`,
    };
    code.textContent = lines[mode];
    note.textContent = {
      cell: "The first index picks a row (an inner list); the second picks an item in that row. Click any cell.",
      row: "A row is easy: it's one of the inner lists.",
      col: "A column is harder: you have to take the same position from every row.",
      diag: "The main diagonal is where the row number equals the column number.",
      near: "Neighbours are the up to 8 cells around this one. At the edges some are missing, so check the bounds.",
    }[mode];
  }
  draw();
}
