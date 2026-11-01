// range(start, stop, step) on a number line: which values are produced, and why stop is never one of them.
import { h, svg } from "../site.js?v=588dc67651";

export default function rangeviz(el, { start = 0, stop = 10, step = 1 } = {}) {
  const mk = (v, label) => h("input", { type: "number", class: "w-input", value: v, style: "width:5.5em", "aria-label": label });
  const iStart = mk(start, "start"), iStop = mk(stop, "stop"), iStep = mk(step, "step");
  const code = h("div", { style: "font:600 1.1rem var(--f-code);margin-top:.7rem" });
  const pic = svg("svg", { class: "w-svg", role: "img", "aria-label": "Number line" });
  const out = h("div", { class: "w-out", style: "margin-top:.5rem;overflow-x:auto;white-space:nowrap" });
  const note = h("p", { class: "w-note" });
  const presets = [[0, 10, 1], [1, 11, 1], [0, 20, 5], [10, 0, -1], [10, 0, -3], [5, 5, 1], [0, 10, -1]];
  el.append(h("div", { class: "w-row" }, h("code", {}, "start"), iStart, h("code", {}, "stop"), iStop, h("code", {}, "step"), iStep),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, presets.map(([a, b, c]) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { iStart.value = a; iStop.value = b; iStep.value = c; draw(); } }, `range(${a}, ${b}${c === 1 ? "" : ", " + c})`))),
    code, pic, out, note);

  function draw() {
    const a = parseInt(iStart.value || "0", 10), b = parseInt(iStop.value || "0", 10), c = parseInt(iStep.value || "1", 10);
    code.textContent = `range(${a}, ${b}${c === 1 ? "" : ", " + c})`;
    if (!c) { pic.replaceChildren(); out.textContent = "ValueError: range() arg 3 must not be zero"; note.textContent = "A step of 0 would never get anywhere, so Python refuses."; return; }
    const vals = [];
    for (let v = a; c > 0 ? v < b : v > b; v += c) { vals.push(v); if (vals.length > 200) break; }
    const lo = Math.min(a, b) - 1, hi = Math.max(a, b) + 1;
    const W = 640, X = (v) => 20 + ((v - lo) / (hi - lo || 1)) * (W - 40);
    pic.setAttribute("viewBox", `0 0 ${W} 110`);
    pic.replaceChildren(svg("line", { x1: 20, y1: 60, x2: W - 20, y2: 60, stroke: "var(--ink-3)" }));
    const span = hi - lo;
    for (let v = lo; v <= hi; v++) {
      if (span > 40 && v % 5) continue;
      pic.append(svg("line", { x1: X(v), y1: 56, x2: X(v), y2: 64, stroke: "var(--ink-3)" }),
        svg("text", { x: X(v), y: 84, "text-anchor": "middle", "font-size": 11, class: "dim", text: v }));
    }
    for (let k = 0; k + 1 < vals.length && k < 60; k++) {
      const x1 = X(vals[k]), x2 = X(vals[k + 1]);
      pic.append(svg("path", { d: `M${x1},52 Q${(x1 + x2) / 2},${30} ${x2},52`, fill: "none", stroke: "var(--blue)", "stroke-width": 1.5, opacity: .6 }));
    }
    vals.slice(0, 200).forEach((v, k) => pic.append(svg("circle", { cx: X(v), cy: 60, r: 6, fill: k === 0 ? "var(--yellow)" : "var(--blue)", stroke: k === 0 ? "#c99a0b" : "none" })));
    pic.append(svg("circle", { cx: X(b), cy: 60, r: 7, fill: "var(--surface)", stroke: "var(--red)", "stroke-width": 2 }),
      svg("text", { x: X(b), y: 104, "text-anchor": "middle", "font-size": 11, fill: "var(--red)", text: "stop (never included)" }));
    out.textContent = `list(${code.textContent}) = [${vals.join(", ")}]`;
    note.textContent = vals.length
      ? `${vals.length} value${vals.length === 1 ? "" : "s"}. It starts at ${a} (yellow) and takes steps of ${c}, stopping before it reaches or passes ${b}.${c === 1 ? ` With step 1, the count is always stop - start = ${b - a}.` : ""}`
      : `Empty: no values at all. ${c > 0 ? `Counting up from ${a}, you're already at or past ${b}.` : `Counting down from ${a}, you're already at or below ${b}.`} A for loop over this range runs 0 times.`;
  }
  [iStart, iStop, iStep].forEach((x) => (x.oninput = draw));
  draw();
}
