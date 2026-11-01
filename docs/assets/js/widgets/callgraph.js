// Structure chart: which of a program's functions call which, drawn as a tree from the main program.
// Stubs (functions with no real body yet) are marked, so a top-down plan shows what's left to write.
import { h } from "../site.js?v=8fe38f9496";
import { py } from "../runtime.js?v=8fe38f9496";

export default function callgraph(el, { code = "" } = {}) {
  const area = h("textarea", { class: "w-input", spellcheck: "false", rows: Math.min(18, Math.max(6, code.split("\n").length)), style: "width:100%;font-family:var(--f-code);line-height:1.5;resize:vertical", "aria-label": "Program" });
  area.value = code;
  const chart = h("div", { style: "margin-top:.8rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("details", {}, h("summary", { class: "w-label", style: "cursor:pointer" }, "Edit the program"), area), chart, note);

  const box = (name, doc, stub, seen) => h("span", {
    style: `display:inline-flex;flex-direction:column;gap:.1rem;padding:.35rem .6rem;border-radius:6px;border:1px solid ${stub ? "var(--yellow)" : "var(--line)"};background:${stub ? "var(--yellow-soft)" : "var(--surface)"};${seen ? "opacity:.6;border-style:dashed" : ""}`,
  }, h("code", { style: "font-weight:700;background:none;padding:0" }, name === "(main program)" ? name : name + "()"),
  doc ? h("span", { style: "font-size:.78rem;color:var(--ink-2)" }, doc) : null,
  stub ? h("span", { style: "font-size:.7rem;font-weight:700;color:var(--ink-2)" }, "STUB: not written yet") : null,
  seen ? h("span", { style: "font-size:.7rem;color:var(--ink-3)" }, "shown above") : null);

  function tree(name, g, path, shown) {
    const seen = shown.has(name);
    shown.add(name);
    const kids = seen || path.includes(name) ? [] : (g.edges[name] || []);
    const recursive = (g.edges[name] || []).includes(name);
    return h("li", { style: "margin:.35rem 0;list-style:none;position:relative" },
      box(name, g.docs[name], g.stubs.includes(name), seen),
      recursive && !seen ? h("span", { style: "margin-left:.5rem;font-size:.8rem;color:var(--violet)" }, "↻ calls itself") : null,
      kids.length ? h("ul", { style: "margin:.2rem 0 0 1.1rem;padding-left:1rem;border-left:2px solid var(--line)" },
        kids.filter((k) => k !== name).map((k) => tree(k, g, [...path, name], shown))) : null);
  }
  let t;
  async function go() {
    const g = await py.call("call_graph", area.value);
    if (g.error) { chart.replaceChildren(h("div", { class: "w-err" }, g.error)); note.textContent = ""; return; }
    const shown = new Set();
    chart.replaceChildren(h("ul", { style: "margin:0;padding:0" }, tree("(main program)", g, [], shown)),
      g.unused.length ? h("div", { style: "margin-top:.6rem;font-size:.9rem" }, "Never called: ", g.unused.map((n) => h("code", { style: "margin-right:.4rem" }, n + "()"))) : "");
    const n = Object.keys(g.edges).length - 1;
    note.textContent = `${n} function${n === 1 ? "" : "s"}. Each box calls the boxes indented under it. Yellow boxes are stubs, still waiting for their real code. A dashed box was already drawn higher up.`;
  }
  area.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 400); });
  go();
}
