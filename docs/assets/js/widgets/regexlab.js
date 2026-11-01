// Regex lab: a pattern, some text, and every match highlighted, with its groups. It runs real
// Python (re.finditer), so what you see is exactly what your code will do.
import { h } from "../site.js?v=588dc67651";
import { py } from "../runtime.js?v=588dc67651";

export default function regexlab(el, { pattern = "\\d+", text = "Order 66 shipped on 2026-10-31 to Flat 4B, Leeds LS1 4AB.", presets = [], flags = [] } = {}) {
  const pat = h("input", { class: "w-input", value: pattern, spellcheck: "false", style: "flex:1 1 220px;font-family:var(--f-code)", "aria-label": "Pattern" });
  const txt = h("textarea", { class: "w-input", rows: 3, spellcheck: "false", style: "width:100%;font-family:var(--f-code);resize:vertical", "aria-label": "Text to search" }, text);
  const ic = h("input", { type: "checkbox", checked: flags.includes("I") || null }), ml = h("input", { type: "checkbox", checked: flags.includes("M") || null });
  const shown = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap;line-height:1.7" });
  const table = h("div", { style: "margin-top:.5rem;font-size:.85rem" });
  const chips = h("div", { class: "w-row", style: "flex-wrap:wrap;gap:.35rem;margin-top:.4rem" });
  el.append(
    h("div", { class: "w-row", style: "align-items:center;gap:.4rem;flex-wrap:wrap" }, h("code", {}, "re.finditer(r\""), pat, h("code", {}, "\", text)")),
    h("div", { class: "w-row", style: "gap:1rem;margin:.35rem 0;flex-wrap:wrap" },
      h("label", { class: "w-label", style: "display:inline-flex;gap:.3rem;align-items:center" }, ic, "re.IGNORECASE"),
      h("label", { class: "w-label", style: "display:inline-flex;gap:.3rem;align-items:center" }, ml, "re.MULTILINE")),
    txt, chips, shown, table);
  chips.replaceChildren(...presets.map((p) => { const b = h("button", { type: "button", class: "w-chip", style: "cursor:pointer;font-family:var(--f-code)" }, p); b.onclick = () => { pat.value = p; go(); }; return b; }));
  let t;
  async function go() {
    const f = [ic.checked ? "re.I" : "", ml.checked ? "re.M" : ""].filter(Boolean).join("|") || "0";
    const code = `__import__('json').dumps((lambda re: [[m.start(), m.end(), m.group(0), list(m.groups()), m.groupdict()] for m in re.finditer(${JSON.stringify(pat.value)}, ${JSON.stringify(txt.value)}, ${f})][:200])(__import__('re')))`;
    const r = await py.eval(code, true);
    if (r.error) { shown.replaceChildren(h("span", { class: "w-err" }, String(r.error).split("\n").pop())); table.replaceChildren(); return; }
    const ms = JSON.parse(r.value), s = txt.value, parts = [];
    let at = 0;
    ms.forEach(([a, b], i) => {
      if (a > at) parts.push(s.slice(at, a));
      parts.push(h("mark", { style: `background:${i % 2 ? "var(--blue-soft)" : "var(--yellow-soft)"};color:var(--ink);border-radius:3px;padding:0 1px;outline:1px solid var(--line)` }, s.slice(a, b) || "∅"));
      at = Math.max(at, b);
    });
    parts.push(s.slice(at));
    shown.replaceChildren(...parts);
    const anyGroups = ms.some((m) => m[3].length);
    table.replaceChildren(h("div", { class: "w-label" }, `${ms.length} match${ms.length === 1 ? "" : "es"}`),
      ...ms.slice(0, 12).map(([a, b, g0, gs, gd]) => h("div", { style: "font-family:var(--f-code)" },
        `${a}-${b}: ${JSON.stringify(g0)}` + (anyGroups ? "   groups " + JSON.stringify(gs) : "") + (Object.keys(gd).length ? "   " + JSON.stringify(gd) : ""))));
  }
  [pat, txt].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 300); }));
  ic.onchange = go; ml.onchange = go;
  go();
}
