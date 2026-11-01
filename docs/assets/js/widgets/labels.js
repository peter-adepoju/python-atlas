// Two mental models side by side: "variables are boxes" versus "names are labels on objects".
import { h, svg, reducedMotion } from "../site.js?v=871ff52039";

const SCENARIOS = {
  copy: { label: "x = 5, then y = x, then x = 7", lines: ["x = 5", "y = x", "x = 7"] },
  swap: { label: "Swap two values with a, b = b, a", lines: ["a = 'red'", "b = 'blue'", "a, b = b, a"] },
  grow: { label: "score = score + 1", lines: ["score = 10", "score = score + 1", "score = score + 1"] },
};

function simulate(lines) {
  // Tiny interpreter for the scenarios above. Returns a state after each line.
  const names = {}; const objects = []; const states = [];
  const obj = (v) => { let o = objects.find((x) => x.v === v); if (!o) { o = { id: objects.length, v }; objects.push(o); } return o.id; };
  const val = (expr) => {
    expr = expr.trim();
    if (/^'.*'$/.test(expr)) return obj(expr);
    if (/^-?\d+$/.test(expr)) return obj(+expr);
    const m = expr.match(/^(\w+) \+ (\d+)$/);
    if (m) return obj(objects[names[m[1]]].v + +m[2]);
    return names[expr];
  };
  for (const line of lines) {
    const [lhs, rhs] = line.split(" = ");
    if (lhs.includes(",")) {
      const ids = rhs.split(",").map(val);
      lhs.split(",").forEach((n, i) => { names[n.trim()] = ids[i]; });
    } else names[lhs] = val(rhs);
    states.push({ line, names: { ...names }, objects: objects.map((o) => ({ ...o })) });
  }
  return states;
}

export default function labels(el, { scenario = "copy" } = {}) {
  let key = scenario, i = 0, states = [];
  const pick = h("select", { class: "w-input", "aria-label": "Scenario" }, Object.entries(SCENARIOS).map(([k, s]) => h("option", { value: k, selected: k === key }, s.label)));
  const code = h("pre", { class: "w-out", style: "margin:.6rem 0" });
  const W = 640, H = 240;
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "w-svg", role: "img", "aria-label": "Box model and label model" });
  const note = h("p", { class: "w-note", "aria-live": "polite" });
  const next = h("button", { type: "button", class: "btn btn-step" }, "Run next line");
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  el.append(h("div", { class: "w-row" }, pick), code, h("div", { class: "w-row" }, back, next), s, note);

  function draw() {
    const st = i > 0 ? states[i - 1] : { names: {}, objects: [] };
    code.replaceChildren(...SCENARIOS[key].lines.map((l, n) => h("div", { style: n === i - 1 ? "background:var(--prev)" : n === i ? "background:var(--yellow-soft);box-shadow:inset 3px 0 var(--yellow)" : "" }, l)));
    s.replaceChildren();
    s.append(svg("text", { x: 20, y: 22, "font-size": 14, "font-weight": 700, text: "Boxes: a common picture, but wrong" }));
    s.append(svg("text", { x: 340, y: 22, "font-size": 14, "font-weight": 700, text: "Labels on objects: how Python works" }));
    s.append(svg("line", { x1: 320, y1: 10, x2: 320, y2: H - 10, stroke: "var(--line)" }));
    const names = Object.keys(st.names);
    names.forEach((n, k) => {
      const y = 50 + k * 58;
      const v = st.objects[st.names[n]].v;
      s.append(svg("rect", { x: 70, y, width: 120, height: 42, rx: 4, fill: "var(--paper)", stroke: "var(--ink-3)" }));
      s.append(svg("text", { x: 60, y: y + 26, "text-anchor": "end", class: "mono", "font-size": 14, text: n }));
      s.append(svg("text", { x: 130, y: y + 27, "text-anchor": "middle", class: "mono", "font-size": 15, text: String(v) }));
    });
    // Label model
    const used = st.objects.filter((o) => Object.values(st.names).includes(o.id));
    const oy = {};
    used.forEach((o, k) => { oy[o.id] = 50 + k * 58; });
    st.objects.filter((o) => !used.includes(o)).forEach((o, k) => { oy[o.id] = 50 + (used.length + k) * 58; });
    st.objects.forEach((o) => {
      const y = oy[o.id];
      const alive = used.includes(o);
      s.append(svg("rect", { x: 500, y, width: 110, height: 42, rx: 21, fill: alive ? "var(--surface)" : "var(--sunk)", stroke: alive ? "var(--blue)" : "var(--line)", "stroke-dasharray": alive ? "" : "4 3" }));
      s.append(svg("text", { x: 555, y: y + 27, "text-anchor": "middle", class: "mono", "font-size": 15, fill: alive ? "var(--ink)" : "var(--ink-3)", text: String(o.v) }));
      if (!alive) s.append(svg("text", { x: 555, y: y + 56, "text-anchor": "middle", class: "dim", "font-size": 11, text: "no names left: Python frees it" }));
    });
    names.forEach((n, k) => {
      const y = 50 + k * 58 + 21;
      const ty = oy[st.names[n]] + 21;
      s.append(svg("rect", { x: 350, y: y - 15, width: 70, height: 30, rx: 5, fill: "var(--yellow-soft)", stroke: "var(--yellow)" }));
      s.append(svg("text", { x: 385, y: y + 5, "text-anchor": "middle", class: "mono", "font-size": 14, text: n }));
      const p = svg("path", { d: `M420,${y} C460,${y} 460,${ty} 498,${ty}`, fill: "none", stroke: "var(--blue)", "stroke-width": 2, "marker-end": "url(#lb-head)" });
      if (!reducedMotion()) { p.style.transition = "d .4s"; }
      s.append(p);
    });
    s.append(svg("defs", {}, svg("marker", { id: "lb-head", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--blue)" }))));
    const msgs = {
      copy: ["Nothing has run yet.", "x = 5: Python makes the object 5 and sticks the label x on it.", "y = x: no copying! y becomes a second label on the same object.", "x = 7: x is moved to a new object 7. y still points at 5. The boxes picture gets this right, but for the wrong reason."],
      swap: ["Nothing has run yet.", "a points at 'red'.", "b points at 'blue'.", "a, b = b, a: Python reads the right side first ('blue', 'red'), then moves both labels at once. No temporary variable needed."],
      grow: ["Nothing has run yet.", "score points at 10.", "score + 1 is worked out first (11), then the label score moves to the new object. The 10 object, unlabelled, is thrown away.", "Same again: 12. ints can't change; the label moves instead."],
    };
    note.textContent = msgs[key][i];
    next.disabled = i >= states.length;
    back.disabled = i === 0;
  }
  function load() { states = simulate(SCENARIOS[key].lines); i = 0; draw(); }
  next.onclick = () => { i++; draw(); };
  back.onclick = () => { i--; draw(); };
  pick.onchange = () => { key = pick.value; load(); };
  load();
}
