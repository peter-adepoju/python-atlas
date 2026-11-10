// What Python does with your code: tokens → tree → bytecode → output. All computed live.
import { h } from "../site.js?v=db5173407e";
import { py } from "../runtime.js?v=db5173407e";

const KIND_COLOURS = {
  NAME: "var(--blue)", KEYWORD: "var(--violet)", NUMBER: "#b5480f", STRING: "var(--green)", OP: "var(--ink-2)", COMMENT: "var(--ink-3)",
};
const STAGES = [
  ["code", "1. Your code", "You type text. To the computer it is just characters until Python reads it."],
  ["tokens", "2. Tokens", "Python's tokenizer chops the text into words: names, numbers, strings, operators. Spaces between them are dropped."],
  ["tree", "3. Syntax tree", "The parser checks the grammar and builds a tree that says what each part means. Syntax errors are caught here, before anything runs."],
  ["bytecode", "4. Bytecode", "The compiler turns the tree into simple instructions for Python's virtual machine. Notice LOAD, STORE and CALL, like the toy computer above."],
  ["output", "5. Running", "The virtual machine carries out the instructions one by one. This is what you see."],
];

export default function pipeline(el, { code = 'x = 2 + 3\nprint("x is", x)' } = {}) {
  const ta = h("textarea", { class: "w-input", rows: 3, spellcheck: "false", style: "width:100%;font-family:var(--f-code)", "aria-label": "Code to analyse" });
  ta.value = code;
  const tabs = h("div", { class: "w-row", role: "tablist", style: "margin:.6rem 0" });
  const view = h("div", { class: "w-out", style: "min-height:7rem;max-height:20rem;overflow:auto" });
  const note = h("p", { class: "w-note" });
  el.append(ta, tabs, note, view);
  let data = null, cur = "tokens";

  function drawTabs() {
    tabs.replaceChildren(...STAGES.map(([k, label]) => h("button", {
      type: "button", role: "tab", "aria-selected": k === cur ? "true" : "false",
      class: "btn " + (k === cur ? "btn-step" : "btn-quiet"), onclick: () => { cur = k; drawTabs(); show(); },
    }, label)));
  }
  function show() {
    note.textContent = STAGES.find((s) => s[0] === cur)[2];
    if (!data) { view.textContent = "Working…"; return; }
    if (cur === "code") { view.textContent = ta.value; return; }
    if (cur === "tokens") {
      view.replaceChildren(h("div", { style: "display:flex;flex-wrap:wrap;gap:.4rem;white-space:normal" },
        data.tokens.map((t) => h("span", { style: `display:inline-grid;text-align:center;border:1px solid var(--line);border-radius:6px;padding:.2rem .45rem;background:var(--surface)` },
          h("span", { style: `font-family:var(--f-code);color:${KIND_COLOURS[t.kind] || "var(--ink)"}` }, t.text),
          h("span", { style: "font:.68rem var(--f-body);color:var(--ink-3)" }, t.kind.toLowerCase())))));
      return;
    }
    if (cur === "tree") { view.textContent = data.error || data.tree; return; }
    if (cur === "bytecode") { view.textContent = data.error || data.bytecode; return; }
    view.textContent = (data.output || "") + (data.run_error ? "\n" + data.run_error : "") || "(nothing printed)";
  }
  let t = null;
  async function refresh() {
    data = null; show();
    data = await py.call("pipeline", ta.value);
    show();
  }
  ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(refresh, 450); });
  drawTabs();
  refresh();
}
