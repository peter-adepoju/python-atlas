// Nested data explorer: draws nested lists and dictionaries as a tree. Click any part to see
// the expression that reaches it, and its value.
import { h } from "../site.js?v=7343aa5d1b";
import { py } from "../runtime.js?v=7343aa5d1b";

const SAMPLE = `{
    "name": "Python Atlas",
    "students": [
        {"name": "Ada", "marks": [93, 88], "city": "Lagos"},
        {"name": "Bo", "marks": [41, 67], "city": "Accra"},
    ],
    "settings": {"theme": "dark", "size": 14},
}`;

export default function nestview(el, { data = SAMPLE } = {}) {
  const area = h("textarea", { class: "w-input", spellcheck: "false", rows: Math.min(14, data.split("\n").length + 1), style: "width:100%;font-family:var(--f-code);line-height:1.5;resize:vertical", "aria-label": "Data" });
  area.value = data;
  const tree = h("div", { style: "margin-top:.7rem;font:500 .92rem/1.55 var(--f-code);overflow-x:auto" });
  const pathBox = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap" }, "Click any part of the tree.");
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-label" }, "data ="), area, tree, pathBox, note);
  let selected = null;

  const TAG = { dict: ["{ }", "var(--violet)"], list: ["[ ]", "var(--blue)"], tuple: ["( )", "var(--blue)"] };
  function pick(node, row) {
    if (selected) selected.style.background = "";
    selected = row; row.style.background = "var(--yellow-soft)";
    const value = node.kids ? `${node.kind} with ${node.n} ${node.kind === "dict" ? "entr" + (node.n === 1 ? "y" : "ies") : "item" + (node.n === 1 ? "" : "s")}` : `${node.repr}   (${node.kind})`;
    pathBox.textContent = `${node.path}\n  -> ${value}`;
  }
  function draw(label, node, depth) {
    const box = h("div", {});
    const isBox = !!node.kids;
    const caret = h("span", { style: "display:inline-block;width:1.1em;color:var(--ink-3)" }, isBox ? "▾" : "");
    const row = h("div", { style: `padding:.05rem .3rem;margin-left:${depth * 1.2}em;border-radius:4px;cursor:pointer;white-space:nowrap`, tabindex: "0" },
      caret,
      label !== null ? h("span", { style: "color:var(--ink-2)" }, label, ": ") : null,
      isBox ? h("span", { style: `color:${TAG[node.kind][1]};font-weight:700` }, TAG[node.kind][0], h("span", { class: "muted", style: "font-weight:400" }, ` ${node.n}`))
        : h("span", { style: "color:var(--green)" }, node.repr));
    box.append(row);
    let kidsBox = null;
    if (isBox) { kidsBox = h("div", {}, node.kids.map(([k, v]) => draw(k, v, depth + 1))); box.append(kidsBox); }
    const act = (e) => { e.stopPropagation(); pick(node, row); };
    row.addEventListener("click", act);
    row.addEventListener("keydown", (e) => { if (e.key === "Enter") act(e); });
    if (isBox) caret.addEventListener("click", (e) => { e.stopPropagation(); kidsBox.hidden = !kidsBox.hidden; caret.textContent = kidsBox.hidden ? "▸" : "▾"; });
    return box;
  }
  let t;
  async function go() {
    const r = await py.call("nest_tree", area.value);
    if (r.error) { tree.replaceChildren(h("span", { class: "w-err" }, r.error)); return; }
    tree.replaceChildren(draw(null, r.tree, 0));
    pathBox.textContent = "Click any part of the tree.";
    note.textContent = "Purple { } is a dictionary, blue [ ] a list; the small number is how many entries or items it holds. Each step down the tree is one more pair of square brackets: a key for a dictionary, an index for a list. Click the arrows to fold a part away.";
  }
  area.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 450); });
  go();
}
