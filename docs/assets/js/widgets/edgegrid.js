// Edge-case grid: several versions of the same function, run on awkward inputs.
// Each cell shows what that version gave; red cells differ from the correct version.
import { h } from "../site.js?v=86aca22b42";
import { py } from "../runtime.js?v=86aca22b42";

export default function edgegrid(el, { versions, cases, ref, title = "f" }) {
  const names = Object.keys(versions);
  const codeBox = h("pre", { class: "w-out", style: "margin:.5rem 0 0;max-height:260px;overflow:auto" });
  const tableBox = h("div", { style: "overflow-x:auto;margin-top:.7rem" });
  const note = h("p", { class: "w-note" });
  const chips = names.map((n) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { codeBox.textContent = versions[n]; } }, n));
  el.append(h("div", { class: "w-label" }, "Click a version to read its code:"), h("div", { class: "w-row", style: "margin-top:.3rem" }, chips), codeBox, tableBox, note);
  codeBox.textContent = versions[names.find((n) => n !== ref)];
  (async () => {
    const r = await py.call("edge_grid", JSON.stringify(versions), JSON.stringify(cases), ref);
    const head = h("tr", {}, h("th", {}, `${title}(...)`), names.map((n) => h("th", { style: "font-family:var(--f-code);font-size:.85rem" }, n)));
    const rows = cases.map((c, i) => h("tr", {}, h("td", { style: "font-family:var(--f-code);white-space:nowrap" }, c),
      names.map((n) => { const cell = r.table[n][i]; const bad = !cell.right;
        return h("td", { style: `font-family:var(--f-code);font-size:.88rem;white-space:nowrap;${bad ? "background:var(--red-soft);color:var(--red);font-weight:700" : n === ref ? "color:var(--green)" : ""}` }, cell.ok ? cell.value : `raises ${cell.value}`); })));
    tableBox.replaceChildren(h("table", { style: "margin:0" }, h("thead", {}, head), h("tbody", {}, rows)));
    const failing = names.filter((n) => n !== ref).map((n) => [n, cases.filter((_, i) => !r.table[n][i].right)]);
    note.textContent = failing.map(([n, cs]) => cs.length ? `${n} goes wrong on ${cs.join(", ")}.` : `${n} survives every case here.`).join(" ") + " The ordinary inputs at the top hide every one of these bugs.";
  })();
}
