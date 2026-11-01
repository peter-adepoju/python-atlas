// Comprehension lab: build a list comprehension from its parts, see the loop it stands for,
// and follow each item through the condition and the expression.
import { h } from "../site.js?v=8fe38f9496";
import { py } from "../runtime.js?v=8fe38f9496";

const PRESETS = [
  ["n * n", "n", "range(1, 7)", ""],
  ["n", "n", "[4, 7, 10, 3, 8]", "n % 2 == 0"],
  ["w.upper()", "w", '["tea", "milk", "rice"]', ""],
  ["len(w)", "w", '"the cat sat on the mat".split()', "len(w) > 2"],
  ["c", "c", '"Python Atlas"', "c.isupper()"],
  ["price * 2", "price", "[100, 250, 80]", "price < 200"],
];

export default function complab(el, { preset = 0 } = {}) {
  const p = PRESETS[preset] || PRESETS[0];
  const inp = (v, w, label) => h("input", { class: "w-input", value: v, spellcheck: "false", style: `flex:1 1 ${w}`, "aria-label": label });
  const exprIn = inp(p[0], "110px", "Expression"), varIn = inp(p[1], "50px", "Loop variable"),
    srcIn = inp(p[2], "180px", "Sequence"), condIn = inp(p[3], "130px", "Condition (optional)");
  const code = h("pre", { class: "w-out", style: "margin:.6rem 0 0" });
  const loop = h("pre", { class: "w-out", style: "margin:.4rem 0 0" });
  const table = h("div", { style: "margin-top:.7rem" });
  const res = h("div", { style: "margin-top:.6rem;font:600 .95rem var(--f-code)" });
  const lab = (t) => h("span", { class: "w-label" }, t);
  el.append(
    h("div", { class: "w-row", style: "align-items:center;gap:.35rem" }, h("code", {}, "["), exprIn, h("code", {}, "for"), varIn, h("code", {}, "in"), srcIn, h("code", {}, "if"), condIn, h("code", {}, "]")),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, PRESETS.map((q, i) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { [exprIn.value, varIn.value, srcIn.value, condIn.value] = q; go(); } }, `[${q[0]} for ${q[1]} in ${q[2].length > 14 ? q[2].slice(0, 12) + "…" : q[2]}${q[3] ? " if …" : ""}]`))),
    h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.8rem;margin-top:.4rem" },
      h("div", {}, lab("The comprehension"), code), h("div", {}, lab("The loop it stands for"), loop)),
    table, res);
  let t;
  async function go() {
    const r = await py.call("comp_steps", exprIn.value, varIn.value, srcIn.value, condIn.value);
    code.textContent = r.code || "";
    if (r.error) { loop.textContent = ""; table.replaceChildren(); res.replaceChildren(h("span", { class: "w-err" }, r.error)); return; }
    loop.textContent = r.loop;
    const hasCond = condIn.value.trim() !== "";
    table.replaceChildren(lab("Each item in turn"), h("table", { style: "margin:.25rem 0 0" },
      h("thead", {}, h("tr", {}, h("th", {}, varIn.value), hasCond ? h("th", {}, "condition") : null, h("th", {}, "goes into the list"))),
      h("tbody", {}, r.rows.map(([item, keep, val]) => h("tr", { style: keep ? "" : "opacity:.55" },
        h("td", { style: "font-family:var(--f-code)" }, item),
        hasCond ? h("td", { style: `font-family:var(--f-code);color:${keep ? "var(--green)" : "var(--red)"}` }, keep ? "True" : "False") : null,
        h("td", { style: "font-family:var(--f-code);color:var(--blue)" }, keep ? val : "(skipped)"))))));
    res.replaceChildren("result = ", r.result);
  }
  [exprIn, varIn, srcIn, condIn].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 350); }));
  go();
}
