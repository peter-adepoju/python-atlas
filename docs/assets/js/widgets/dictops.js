// Dictionary lab: a dictionary drawn as key -> value rows. Run an operation and see which
// entries were added, changed or removed, and what the operation returned.
import { h } from "../site.js?v=db5173407e";
import { py } from "../runtime.js?v=db5173407e";

const DEFAULT_OPS = ['d["Ada"]', 'd["Bo"] = 55', 'd["Ada"] = 95', 'del d["Cy"]', '"Ada" in d', '93 in d', 'd["Zed"]',
  'd.get("Zed")', 'd.get("Zed", 0)', "len(d)", "list(d)", "d.keys()", "d.values()", "d.items()", 'd.pop("Ada")',
  'd.setdefault("Di", 0)', 'd.update({"Ed": 60, "Cy": 70})'];

export default function dictops(el, { start = '{"Ada": 93, "Cy": 78, "Grace": 88}', ops = DEFAULT_OPS } = {}) {
  let current = start;
  const dIn = h("input", { class: "w-input", value: start, spellcheck: "false", style: "flex:1 1 260px", "aria-label": "Starting dictionary" });
  const opIn = h("input", { class: "w-input", value: ops[0], spellcheck: "false", style: "flex:1 1 200px", "aria-label": "Operation" });
  const run = h("button", { type: "button", class: "btn btn-run" }, "Run");
  const keep = h("label", { class: "w-label", style: "display:flex;gap:.35rem;align-items:center" }, h("input", { type: "checkbox", checked: true }), "keep the result for the next run");
  const view = h("div", { style: "margin-top:.8rem" });
  const ret = h("div", { style: "margin-top:.6rem;font:600 .95rem var(--f-code)" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "d ="), dIn),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, opIn, run, keep),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, ops.map((o) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { opIn.value = o; go(); } }, o))),
    view, ret, note);

  const COL = { added: ["var(--green)", "var(--green-soft)", "added"], changed: ["var(--yellow)", "var(--yellow-soft)", "changed"], removed: ["var(--red)", "var(--red-soft)", "removed"], same: ["var(--blue)", "var(--blue-soft)", ""] };
  const cell = (txt, state, strike) => h("span", { style: `display:inline-block;min-width:3.5em;padding:.3rem .55rem;border-radius:5px;font:600 .95rem var(--f-code);border:1px solid ${COL[state][0]};background:${COL[state][1]};${strike ? "text-decoration:line-through;opacity:.7" : ""}` }, txt);
  function draw(label, rows) {
    if (!rows.length) return h("div", {}, h("div", { class: "w-label" }, label), h("span", { class: "muted" }, "{} (empty)"));
    return h("div", {}, h("div", { class: "w-label", style: "margin-bottom:.3rem" }, label),
      h("div", { style: "display:grid;grid-template-columns:auto auto 1fr auto;gap:4px .5rem;align-items:center;justify-items:start" },
        rows.flatMap(([k, v, state]) => [cell(k, state === "added" || state === "removed" ? state : "same", state === "removed"), h("span", { class: "muted", "aria-hidden": "true" }, "→"), cell(v, state, state === "removed"), h("span", { class: "w-label", style: `color:${COL[state][0]}` }, COL[state][2])])));
  }
  async function init() {
    const r = await py.call("dict_op", dIn.value, "d");
    if (r.error) { view.replaceChildren(h("span", { class: "w-err" }, r.error)); return; }
    current = dIn.value;
    view.replaceChildren(draw("d", r.before.map(([k, v]) => [k, v, "same"])));
    ret.replaceChildren();
    note.textContent = "Each row is one entry: a key on the left, its value on the right. Choose an operation and press Run.";
  }
  async function go() {
    const r = await py.call("dict_op", current, opIn.value);
    if (r.error) {
      ret.replaceChildren(h("span", { class: "w-err" }, r.error));
      note.textContent = r.error.startsWith("KeyError") ? "There's no entry with that key. Check with in first, or use get, which gives None (or a default you choose) instead of failing." : "";
      return;
    }
    const b = new Map(r.before), a = r.after ? new Map(r.after) : new Map();
    const rows = [];
    for (const [k, v] of r.before) rows.push(a.has(k) ? [k, a.get(k), a.get(k) === v ? "same" : "changed"] : [k, v, "removed"]);
    for (const [k, v] of (r.after || [])) if (!b.has(k)) rows.push([k, v, "added"]);
    view.replaceChildren(r.after ? draw("d afterwards", rows) : h("code", {}, `d is now ${r.after_repr}`));
    ret.replaceChildren(r.is_expr ? h("span", {}, "returns  ", h("code", { style: "font-weight:700" }, r.result)) : h("span", { class: "muted" }, "a statement: it doesn't return anything"));
    const changed = rows.some((x) => x[2] !== "same");
    if (/^\s*\S+\s+in\s+d\s*$/.test(opIn.value)) note.textContent = "in looks only at the keys, never at the values.";
    else if (changed) note.textContent = "The dictionary was changed in place. Assigning to a key that exists replaces its value; assigning to a new key adds an entry. Keys never repeat.";
    else note.textContent = "d is unchanged: this only looks things up.";
    if (keep.querySelector("input").checked && r.after) current = r.after_repr;
  }
  run.onclick = go;
  opIn.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  dIn.addEventListener("change", init);
  init();
}
