// Pseudocode beside Python: hover or tap a line on either side to light up the lines it matches.
import { h } from "../site.js?v=9f26fe5be3";

export default function pseudomap(el, { steps }) {
  // steps: [[pseudocode line, python lines (string, may hold several lines)], ...]
  const left = h("div", { style: "font:500 .92rem/1.6 var(--f-body)" });
  const right = h("div", { style: "font:500 .9rem/1.6 var(--f-code)" });
  const rowsL = [], rowsR = [];
  const COL = ["var(--blue-soft)", "var(--yellow-soft)", "var(--green-soft)", "var(--red-soft)"];
  steps.forEach(([p, code], i) => {
    const indent = (p.match(/^ */) || [""])[0].length;
    const l = h("div", { tabindex: "0", style: `padding:.1rem .5rem .1rem ${0.5 + indent * 0.6}em;border-radius:4px;cursor:pointer` }, p.trim());
    const r = h("div", { style: "padding:.1rem .5rem;border-radius:4px;white-space:pre;cursor:pointer" }, code);
    const on = () => { [...rowsL, ...rowsR].forEach((x) => { x.style.background = ""; }); l.style.background = r.style.background = COL[i % COL.length]; };
    [l, r].forEach((x) => { x.addEventListener("mouseenter", on); x.addEventListener("focus", on); x.addEventListener("click", on); });
    rowsL.push(l); rowsR.push(r); left.append(l); right.append(r);
  });
  el.append(h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;align-items:start" },
    h("div", {}, h("div", { class: "w-label" }, "The plan, in words"), left),
    h("div", {}, h("div", { class: "w-label" }, "The same plan in Python"), h("div", { style: "background:var(--code-bg);border:1px solid var(--line);border-radius:var(--radius-s);padding:.3rem 0;overflow-x:auto" }, right))));
  rowsL[0] && rowsL[0].click();
}
