// Truth-table builder: type a condition using a, b and c, and see its value for every combination.
import { h } from "../site.js?v=0064081c78";
import { py } from "../runtime.js?v=0064081c78";

export default function truthtable(el, { expr = "a and b", tries = ["a and b", "a or b", "not a", "not (a and b)", "not a or not b", "a and not b or b and not a"], compare = "" } = {}) {
  const input = h("input", { class: "w-input", value: expr, spellcheck: "false", style: "flex:1 1 260px", "aria-label": "Condition" });
  const table = h("div", { style: "overflow-x:auto;margin-top:.8rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Condition"), input),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, tries.map((x) =>
      h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { input.value = x; go(); } }, x))),
    table, note);

  const cell = (v) => h("td", { style: `text-align:center;font:600 .95rem var(--f-code);${v === true ? "color:var(--green)" : v === false ? "color:var(--ink-3)" : ""}` }, String(v === true ? "True" : v === false ? "False" : v));
  let t;
  async function go() {
    const e = input.value.trim();
    const names = ["a", "b", "c"].filter((n) => new RegExp(`\\b${n}\\b`).test(e));
    if (!names.length) { table.replaceChildren(); note.textContent = "Use the names a, b and c in your condition."; return; }
    const code = `__import__('json').dumps([[list(v), (lambda ${names.join(", ")}: (${e}))(*v)${compare ? `, (lambda ${names.join(", ")}: (${compare}))(*v)` : ""}] for v in __import__('itertools').product([True, False], repeat=${names.length})], default=repr)`;
    const r = await py.eval(code, true);
    if (r.error) { table.replaceChildren(h("span", { class: "w-err" }, r.error)); note.textContent = ""; return; }
    const rows = JSON.parse(r.value);
    table.replaceChildren(h("table", { style: "min-width:280px" },
      h("thead", {}, h("tr", {}, names.map((n) => h("th", { style: "text-align:center" }, n)),
        h("th", { style: "text-align:center;border-left:2px solid var(--line)" }, h("code", {}, e)),
        compare ? h("th", { style: "text-align:center" }, h("code", {}, compare)) : null)),
      h("tbody", {}, rows.map(([vals, out, out2]) => h("tr", { style: out === true ? "background:var(--green-soft)" : "" },
        vals.map(cell), h("td", { style: "border-left:2px solid var(--line);text-align:center;font:700 .95rem var(--f-code)" }, String(out === true ? "True" : out === false ? "False" : out)),
        compare ? cell(out2) : null)))));
    const n = rows.filter((x) => x[1] === true).length;
    const same = compare && rows.every((x) => x[1] === x[2]);
    note.textContent = `${rows.length} combinations; the condition is True in ${n} of them.` +
      (compare ? (same ? " The two columns match in every row, so the two conditions always agree." : " The two columns differ somewhere, so the conditions are not the same.") : "");
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 350); });
  go();
}
