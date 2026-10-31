// The string ruler: positive and negative indices, and slices you can drag. Python checks every answer.
import { h } from "../site.js?v=db382219e3";
import { py } from "../runtime.js?v=db382219e3";

export default function strruler(el, { text = "Python", mode = "slice" } = {}) {
  const tIn = h("input", { class: "w-input", value: text, spellcheck: "false", style: "width:12em", "aria-label": "The string" });
  const mk = (ph) => h("input", { class: "w-input", placeholder: ph, style: "width:4.2em;text-align:center", spellcheck: "false", "aria-label": ph });
  const iStart = mk("start"), iStop = mk("stop"), iStep = mk("step"), iIdx = mk("index");
  iStart.value = mode === "slice" ? "1" : ""; iStop.value = mode === "slice" ? "4" : ""; iIdx.value = "0";
  const modeSel = h("select", { class: "w-input", "aria-label": "Mode" }, h("option", { value: "index", selected: mode === "index" }, "one index: s[i]"), h("option", { value: "slice", selected: mode === "slice" }, "a slice: s[start:stop:step]"));
  const exprLine = h("div", { style: "font:600 1.15rem var(--f-code);margin:.6rem 0" });
  const ruler = h("div", { style: "overflow-x:auto;padding:.3rem 0" });
  const note = h("p", { class: "w-note", "aria-live": "polite" });
  const ctrls = h("div", { class: "w-row" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "s ="), tIn, modeSel), ctrls, exprLine, ruler, note);

  const num = (x) => (x.value.trim() === "" ? null : parseInt(x.value, 10));
  function controls() {
    ctrls.style.marginTop = ".5rem";
    ctrls.replaceChildren(...(modeSel.value === "index"
      ? [h("code", {}, "s["), iIdx, h("code", {}, "]"), ...[0, 2, -1, -2, 6].map((v) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { iIdx.value = v; go(); } }, `s[${v}]`))]
      : [h("code", {}, "s["), iStart, h("code", {}, ":"), iStop, h("code", {}, ":"), iStep, h("code", {}, "]"),
        ...[["1", "4", ""], ["", "3", ""], ["2", "", ""], ["-3", "", ""], ["", "", "2"], ["", "", "-1"], ["4", "1", "-1"]].map(([a, b, c]) =>
          h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { iStart.value = a; iStop.value = b; iStep.value = c; go(); } }, `s[${a}:${b}${c ? ":" + c : ""}]`))]));
  }

  async function go() {
    const s = tIn.value;
    let picked = [], value, error, resolved = null;
    if (modeSel.value === "index") {
      const i = num(iIdx);
      const r = await py.call("index_info", s, i ?? 0);
      value = r.value; error = r.error;
      if (!error) picked = [((i ?? 0) + s.length) % s.length];
      exprLine.textContent = `s[${i ?? 0}]  →  ${error || value}`;
    } else {
      const a = num(iStart), b = num(iStop), c = num(iStep);
      const r = await py.call("slice_info", s, a, b, c);
      picked = r.idx || []; value = r.value; error = r.error; resolved = r.resolved;
      exprLine.textContent = `s[${a ?? ""}:${b ?? ""}${c !== null ? ":" + c : ""}]  →  ${error || value}`;
    }
    exprLine.style.color = error ? "var(--red)" : "";
    const cellW = 46;
    const row = (cls, items) => h("div", { style: `display:flex` }, items.map((x) => h("div", { style: `width:${cellW}px;flex:none;text-align:center;${cls}` }, x)));
    const chars = [...s].map((ch, i) => {
      const order = picked.indexOf(i);
      const on = order >= 0;
      return h("div", { style: `width:${cellW}px;height:${cellW}px;flex:none;display:grid;place-items:center;position:relative;font:600 1.2rem var(--f-code);border:1px solid var(--line);margin-left:-1px;background:${on ? "var(--yellow-soft)" : "var(--paper)"};${on ? "box-shadow:inset 0 0 0 2px var(--yellow);" : ""}` },
        ch === " " ? "␣" : ch, on && picked.length > 1 ? h("span", { style: "position:absolute;right:3px;top:1px;font:700 .65rem var(--f-body);color:#9a7608" }, order + 1) : "");
    });
    ruler.replaceChildren(
      row("font-size:.75rem;color:var(--blue)", [...s].map((_, i) => i)),
      h("div", { style: "display:flex;padding-left:1px" }, chars),
      row("font-size:.75rem;color:var(--violet)", [...s].map((_, i) => i - s.length)));
    if (error) note.textContent = error.startsWith("IndexError") ? `There is no position ${num(iIdx)}. Valid positions are 0 to ${s.length - 1}, or -1 to -${s.length}.` : error;
    else if (modeSel.value === "index") note.textContent = "Blue numbers count from the left starting at 0; purple numbers count from the right starting at -1. Both name the same boxes.";
    else note.textContent = `Python reads this as start=${resolved[0]}, stop=${resolved[1]}, step=${resolved[2]}. It takes positions from start up to, but not including, stop. The small numbers show the order they're picked in. A slice never raises IndexError: out-of-range ends are simply clipped.`;
  }
  [tIn, iStart, iStop, iStep, iIdx].forEach((x) => x.addEventListener("input", go));
  modeSel.onchange = () => { controls(); go(); };
  controls(); go();
}
