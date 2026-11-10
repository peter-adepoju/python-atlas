// round, int, floor and ceil on a number line. Python computes every value.
import { h, svg } from "../site.js?v=86aca22b42";
import { py } from "../runtime.js?v=86aca22b42";

export default function roundlab(el, { start = 2.5 } = {}) {
  const slider = h("input", { type: "range", min: -4, max: 4, step: 0.1, value: start, style: "flex:1", "aria-label": "x" });
  const val = h("input", { class: "w-input", value: start, style: "width:6em", "aria-label": "x value" });
  const s = svg("svg", { viewBox: "0 0 640 150", class: "w-svg", role: "img", "aria-label": "Number line" });
  const tbl = h("tbody");
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "x ="), val, slider), s,
    h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Python"), h("th", {}, "Result"), h("th", {}, "Rule"))), tbl), note);
  const X = (v) => 40 + ((v + 5) / 10) * 560;
  const FNS = [
    ["round(x)", "nearest whole number; exact halves go to the even neighbour", "var(--blue)"],
    ["int(x)", "chop off the decimal part (towards zero)", "var(--violet)"],
    ["math.floor(x)", "always down", "var(--red)"],
    ["math.ceil(x)", "always up", "var(--green)"],
  ];
  async function draw() {
    const x = parseFloat(val.value);
    if (Number.isNaN(x)) return;
    const code = `(lambda x: [round(x), int(x), __import__('math').floor(x), __import__('math').ceil(x)])(${x})`;
    const r = await py.eval(code, true);
    const res = JSON.parse(r.value);
    s.replaceChildren(svg("line", { x1: 30, y1: 60, x2: 610, y2: 60, stroke: "var(--ink-3)" }));
    for (let v = -5; v <= 5; v++) {
      s.append(svg("line", { x1: X(v), y1: 54, x2: X(v), y2: 66, stroke: "var(--ink-3)" }));
      s.append(svg("text", { x: X(v), y: 84, "text-anchor": "middle", "font-size": 12, class: "dim", text: v }));
    }
    s.append(svg("circle", { cx: X(x), cy: 60, r: 7, fill: "var(--yellow)", stroke: "#c99a0b" }));
    s.append(svg("text", { x: X(x), y: 40, "text-anchor": "middle", "font-size": 13, "font-weight": 700, text: `x = ${x}` }));
    res.forEach((v, i) => {
      const y = 100 + i * 12;
      s.append(svg("path", { d: `M${X(x)},${y} L${X(v)},${y}`, stroke: FNS[i][2], "stroke-width": 3 }));
      s.append(svg("circle", { cx: X(v), cy: y, r: 4, fill: FNS[i][2] }));
    });
    tbl.replaceChildren(...FNS.map(([f, rule, c], i) => h("tr", {}, h("td", {}, h("code", { style: `border-left:4px solid ${c};padding-left:.4em` }, f.replace("x", x))), h("td", {}, h("code", {}, res[i])), h("td", { class: "muted" }, rule))));
    note.textContent = Math.abs(x % 1) === 0.5 ? `${x} is exactly halfway, so round() picks the even neighbour (${res[0]}). This "banker's rounding" avoids pushing totals upward over many roundings.` : "Drag to an exact half like 2.5 or -1.5 and watch round().";
  }
  slider.oninput = () => { val.value = (+slider.value).toFixed(1); draw(); };
  val.oninput = () => { slider.value = val.value; draw(); };
  draw();
}
