// List lab: a list drawn as indexed boxes. Run an operation and see the list before and after,
// what the operation returned, and whether x is still the same list object.
import { h } from "../site.js?v=db5173407e";
import { py } from "../runtime.js?v=db5173407e";

const DEFAULT_OPS = ["x.append(8)", "x.insert(1, 5)", "x.pop()", "x.pop(0)", "x.remove(3)", "x.sort()", "x.reverse()",
  "x[1:3]", "x[-1]", "x[0] = 99", "x.index(4)", "x.count(1)", "len(x)", "x + [0]", "x = x + [0]", "x += [0]", "sorted(x)"];

export default function listops(el, { start = "[3, 1, 4, 1, 5]", ops = DEFAULT_OPS } = {}) {
  let current = start;
  const listIn = h("input", { class: "w-input", value: start, spellcheck: "false", style: "flex:1 1 200px", "aria-label": "Starting list" });
  const opIn = h("input", { class: "w-input", value: ops[0], spellcheck: "false", style: "flex:1 1 200px", "aria-label": "Operation" });
  const run = h("button", { type: "button", class: "btn btn-run" }, "Run");
  const keep = h("label", { class: "w-label", style: "display:flex;gap:.35rem;align-items:center" }, h("input", { type: "checkbox", checked: true }), "keep the result for the next run");
  const before = h("div", {});
  const after = h("div", { style: "margin-top:.6rem" });
  const ret = h("div", { style: "margin-top:.6rem;font:600 .95rem var(--f-code)" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "x ="), listIn),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, opIn, run, keep),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, ops.map((o) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { opIn.value = o; go(); } }, o))),
    h("div", { style: "margin-top:.8rem" }, before, after, ret), note);

  const strip = (label, items, changed) => h("div", {},
    h("div", { class: "w-label", style: "margin-bottom:.25rem" }, label),
    items.length ? h("div", { style: "display:flex;flex-wrap:wrap;gap:3px" }, items.map((v, i) => h("div", { style: "display:grid;text-align:center" },
      h("span", { style: `min-width:2.6em;padding:.3rem .45rem;border-radius:5px;font:600 .95rem var(--f-code);border:1px solid ${changed && changed[i] ? "var(--yellow)" : "var(--blue)"};background:${changed && changed[i] ? "var(--yellow-soft)" : "var(--blue-soft)"}` }, v),
      h("span", { style: "font-size:.65rem;color:var(--ink-3);margin-top:2px" }, `${i}  ${i - items.length}`)))) : h("span", { class: "muted" }, "[] (empty)"));

  function show(items) { before.replaceChildren(strip("x", items)); }
  async function init() {
    const r = await py.call("list_op", listIn.value, "x");
    if (r.error) { before.replaceChildren(h("span", { class: "w-err" }, r.error)); return; }
    current = listIn.value;
    show(r.before);
    after.replaceChildren(); ret.replaceChildren(); note.textContent = "Each box shows an item, with its index underneath (positive and negative). Choose an operation and press Run.";
  }
  async function go() {
    const r = await py.call("list_op", current, opIn.value);
    if (r.error) {
      after.replaceChildren(h("span", { class: "w-err" }, r.error));
      ret.replaceChildren();
      note.textContent = r.error.startsWith("ValueError") ? "The item isn't in the list. Check with in first, or use a loop." : r.error.startsWith("IndexError") ? "There's no item at that index." : "";
      return;
    }
    show(r.before);
    const changed = r.after ? r.after.map((v, i) => r.before[i] !== v) : null;
    after.replaceChildren(r.after ? strip(r.same ? "x afterwards (the same list, changed in place)" : "x afterwards (a NEW list: x now points somewhere else)", r.after, changed) : h("code", {}, `x is now ${r.after_repr}`));
    const changedAny = r.after && (r.after.length !== r.before.length || changed.some(Boolean));
    ret.replaceChildren(r.is_expr ? h("span", {}, "returns  ", h("code", { style: "font-weight:700" }, r.result)) : h("span", { class: "muted" }, "an assignment: it doesn't return anything"));
    if (r.is_expr && r.result === "None" && changedAny) note.textContent = "This method changed the list in place and returned None. Writing x = x.sort() would lose your list!";
    else if (r.is_expr && !changedAny) note.textContent = "x is unchanged: this only reads the list, and gives back a value (or a new list).";
    else if (!r.same) note.textContent = "Assignment with + builds a brand new list and moves the label x to it. Any other name still pointing at the old list keeps the old one.";
    else note.textContent = "The list was changed in place. Every name pointing at this list sees the change.";
    if (keep.querySelector("input").checked) current = r.after_repr;
  }
  run.onclick = go;
  opIn.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  listIn.addEventListener("change", init);
  init();
}
