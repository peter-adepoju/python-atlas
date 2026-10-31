// Sort lab: a list, a key expression, and the result, with every item's key shown beside it.
import { h } from "../site.js?v=0064081c78";
import { py } from "../runtime.js?v=0064081c78";

export default function sortkey(el, { items = '["banana", "Fig", "apple", "Cherry", "kiwi"]', key = "x.lower()", keys = ["x", "len(x)", "x.lower()", "x[-1]", "(len(x), x.lower())", "-len(x)"] } = {}) {
  const itIn = h("input", { class: "w-input", value: items, spellcheck: "false", style: "flex:1 1 280px", "aria-label": "Items" });
  const keyIn = h("input", { class: "w-input", value: key, spellcheck: "false", style: "flex:1 1 200px", "aria-label": "Key expression" });
  const rev = h("input", { type: "checkbox" });
  const before = h("div", {});
  const after = h("div", { style: "margin-top:.8rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "items ="), itIn),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, h("code", {}, "key=lambda x:"), keyIn,
      h("label", { class: "w-label", style: "display:flex;gap:.35rem;align-items:center" }, rev, "reverse=True")),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, keys.map((k) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { keyIn.value = k; go(); } }, k))),
    h("div", { style: "margin-top:.8rem" }, before, after), note);

  const table = (label, rows) => h("div", {}, h("div", { class: "w-label" }, label),
    h("table", { style: "margin:.25rem 0 0" }, h("thead", {}, h("tr", {}, h("th", {}, "item"), h("th", {}, "its key"))),
      h("tbody", {}, rows.map(([v, k]) => h("tr", {}, h("td", { style: "font-family:var(--f-code)" }, v), h("td", { style: "font-family:var(--f-code);color:var(--blue)" }, k))))));
  let t;
  async function go() {
    const code = `__import__('json').dumps((lambda items, f: [[[repr(x), repr(f(x))] for x in items], [[repr(x), repr(f(x))] for x in sorted(items, key=f, reverse=${rev.checked ? "True" : "False"})]])(${itIn.value}, lambda x: (${keyIn.value})))`;
    const r = await py.eval(code, true);
    if (r.error) { after.replaceChildren(h("span", { class: "w-err" }, r.error)); before.replaceChildren(); note.textContent = ""; return; }
    const [b, a] = JSON.parse(r.value);
    before.replaceChildren(table("items, with the key Python works out for each", b));
    after.replaceChildren(table(`sorted(items, key=...${rev.checked ? ", reverse=True" : ""})`, a));
    note.textContent = "Python works out the key once for each item, sorts by the keys, and gives back the items themselves. Items whose keys are equal keep their original order: Python's sort is stable.";
  }
  [itIn, keyIn].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 350); }));
  rev.onchange = go;
  go();
}
