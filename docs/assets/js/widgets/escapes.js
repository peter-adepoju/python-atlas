// What's really inside a string literal: every character, escapes included.
import { h } from "../site.js?v=5b063fa476";
import { py } from "../runtime.js?v=5b063fa476";

export default function escapes(el, { start = "'Name:\\tAda\\nAge:\\t36'", tries = ["'Name:\\tAda\\nAge:\\t36'", "\"It's fine\"", "'It\\'s fine'", "'C:\\\\Users\\\\ada'", "r'C:\\new\\table'", "'''two\nlines'''", "'café ✓'", "''"] }) {
  const input = h("textarea", { class: "w-input", rows: 2, spellcheck: "false", style: "width:100%;font-size:1.02rem", "aria-label": "A string literal" });
  input.value = start;
  const boxes = h("div", { style: "display:flex;flex-wrap:wrap;gap:3px;margin:.7rem 0" });
  const meta = h("div", { class: "w-note" });
  const printed = h("pre", { class: "w-out" });
  el.append(h("div", { class: "w-label" }, "A string literal, exactly as you'd type it in code (with its quotes)"), input,
    h("div", { class: "w-row", style: "margin-top:.4rem" }, tries.map((x) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { input.value = x; go(); } }, x.replace(/\n/g, "↵")))),
    boxes, meta, h("div", { class: "w-label" }, "print(s) shows"), printed);
  let t;
  async function go() {
    const r = await py.call("literal_info", input.value);
    if (r.error) { boxes.replaceChildren(h("span", { class: "w-err" }, r.error)); meta.textContent = ""; printed.textContent = ""; return; }
    boxes.replaceChildren(...r.chars.map((c) => h("div", {
      title: `${c.name || c.ch}, character number ${c.code}`,
      style: `min-width:2.2em;padding:.2rem .3rem;text-align:center;border:1px solid ${c.name && "\n\t\\".includes(c.ch) ? "var(--yellow)" : "var(--line)"};border-radius:4px;background:${c.name && "\n\t\\".includes(c.ch) ? "var(--yellow-soft)" : "var(--paper)"}`,
    }, h("div", { style: "font:600 1.05rem var(--f-code)" }, c.ch === "\n" ? "↵" : c.ch === "\t" ? "⇥" : c.ch === " " ? "␣" : c.ch),
      h("div", { style: "font-size:.65rem;color:var(--ink-3)" }, c.name || c.code))));
    if (!r.chars.length) boxes.append(h("span", { class: "muted" }, "The empty string: zero characters."));
    meta.textContent = `len(s) is ${r.len}. Each escape like \\n or \\t is typed as two characters but stored as one. Python would show it back to you as ${r.repr}.`;
    printed.textContent = r.printed || " ";
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 300); });
  go();
}
