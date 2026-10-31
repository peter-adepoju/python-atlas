// Venn figure: two sets drawn as overlapping circles, with every element in its region.
// Pick an operation to light up the regions it keeps.
import { h } from "../site.js?v=5b063fa476";
import { py } from "../runtime.js?v=5b063fa476";

const OPS = [
  ["a | b", "union: in either", [1, 1, 1]],
  ["a & b", "intersection: in both", [0, 1, 0]],
  ["a - b", "difference: in a but not b", [1, 0, 0]],
  ["b - a", "difference: in b but not a", [0, 0, 1]],
  ["a ^ b", "symmetric difference: in exactly one", [1, 0, 1]],
];

export default function setvenn(el, { a = '{"Ada", "Bo", "Cy", "Di"}', b = '{"Cy", "Di", "Ed"}', labels = ["a", "b"] } = {}) {
  const aIn = h("input", { class: "w-input", value: a, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "Set a" });
  const bIn = h("input", { class: "w-input", value: b, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "Set b" });
  let op = 0;
  const chips = OPS.map(([code], i) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { op = i; paint(); } }, code));
  const svgBox = h("div", { style: "margin-top:.7rem;max-width:560px" });
  const result = h("div", { style: "margin-top:.5rem;font:600 .95rem var(--f-code)" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, `${labels[0]} =`), aIn), h("div", { class: "w-row", style: "margin-top:.4rem" }, h("code", {}, `${labels[1]} =`), bIn),
    h("div", { class: "w-row", style: "margin-top:.5rem" }, chips), svgBox, result, note);
  let data = null;
  const uid = "venn" + Math.random().toString(36).slice(2, 8);
  const NS = "http://www.w3.org/2000/svg";
  const s = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  function paint() {
    chips.forEach((c, i) => { c.style.outline = i === op ? "2px solid var(--blue)" : ""; });
    if (!data) return;
    const keep = OPS[op][2];
    const W = 560, H = 260, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": "Venn diagram of the two sets" });
    const defs = s("defs", {});
    const cA = { cx: 200, cy: 130, r: 115 }, cB = { cx: 360, cy: 130, r: 115 };
    defs.append(s("clipPath", { id: `${uid}A` }));
    defs.children[0].append(s("circle", { cx: cA.cx, cy: cA.cy, r: cA.r }));
    svg.append(defs);
    const on = "var(--blue-soft)";
    if (keep[0]) svg.append(s("circle", { ...cA, fill: on }));
    if (keep[2]) svg.append(s("circle", { ...cB, fill: on }));
    // the middle region: circle b clipped to circle a, shaded or blanked
    svg.append(s("circle", { ...cB, fill: keep[1] ? on : "var(--surface)", "clip-path": `url(#${uid}A)` }));
    svg.append(s("circle", { ...cA, fill: "none", stroke: "var(--blue)", "stroke-width": 2 }), s("circle", { ...cB, fill: "none", stroke: "var(--violet)", "stroke-width": 2 }));
    svg.append(s("text", { x: 110, y: 22, "font-family": "var(--f-code)", "font-weight": 700, fill: "var(--blue)" }, labels[0]), s("text", { x: 440, y: 22, "font-family": "var(--f-code)", "font-weight": 700, fill: "var(--violet)" }, labels[1]));
    const place = (items, x, y0) => {
      const shown = items.slice(0, 7);
      const step = 24, start = y0 - ((shown.length - 1) * step) / 2;
      shown.forEach((t, i) => svg.append(s("text", { x, y: start + i * step + 5, "text-anchor": "middle", "font-family": "var(--f-code)", "font-size": 15, fill: "var(--ink)" }, t.length > 12 ? t.slice(0, 11) + "…" : t)));
      if (items.length > 7) svg.append(s("text", { x, y: start + 7 * step + 5, "text-anchor": "middle", "font-size": 13, fill: "var(--ink-3)" }, `+${items.length - 7} more`));
    };
    place(data.only_a, 140, 130); place(data.both, 280, 130); place(data.only_b, 420, 130);
    svgBox.replaceChildren(svg);
    const parts = [data.only_a, data.both, data.only_b].filter((_, i) => keep[i]).flat();
    result.replaceChildren(`${OPS[op][0]}  ->  `, parts.length ? `{${parts.join(", ")}}` : "set()");
    note.textContent = `${OPS[op][1]}. The shaded regions are the ones kept. Every element appears once, however many times you type it: a set has no duplicates.`;
  }
  let t;
  async function go() {
    const r = await py.call("set_venn", aIn.value, bIn.value);
    if (r.error) { data = null; svgBox.replaceChildren(h("span", { class: "w-err" }, r.error)); result.replaceChildren(); return; }
    data = r; paint();
  }
  [aIn, bIn].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 400); }));
  go();
}
