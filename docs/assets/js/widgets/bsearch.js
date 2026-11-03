// Binary search: step through the search for a target in a sorted list, with lo, mid and hi
// marked and the part still in play highlighted. Compare with linear search's count.
import { h } from "../site.js?v=7343aa5d1b";

export default function bsearch(el, { values = [2, 5, 8, 12, 16, 23, 38, 41, 56, 72, 85, 91], target = 23 } = {}) {
  let t = target, frames = [], k = 0;
  const input = h("input", { type: "number", value: t, style: "width:5.5rem", "aria-label": "Target" });
  const go = h("button", { type: "button", class: "btn btn-quiet" }, "Search");
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const next = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const strip = h("div", { style: "display:flex;flex-wrap:wrap;gap:4px;margin-top:.7rem" });
  const info = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row", style: "align-items:center;flex-wrap:wrap" }, h("span", { class: "w-label" }, "target"), input, go, back, next), strip, info, note);
  function plan() {
    frames = [];
    let lo = 0, hi = values.length - 1, steps = 0;
    frames.push({ lo, hi, mid: null, msg: `Start: lo = 0, hi = ${hi}. The target, if it's here, is somewhere from lo to hi.`, steps });
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2); steps++;
      const v = values[mid];
      if (v === t) { frames.push({ lo, hi, mid, found: true, msg: `mid = (${lo} + ${hi}) // 2 = ${mid}. values[${mid}] is ${v}: found it.`, steps }); return; }
      if (v < t) { frames.push({ lo, hi, mid, msg: `mid = (${lo} + ${hi}) // 2 = ${mid}. values[${mid}] is ${v}, less than ${t}, so the target can only be to the right: lo = ${mid + 1}.`, steps }); lo = mid + 1; }
      else { frames.push({ lo, hi, mid, msg: `mid = (${lo} + ${hi}) // 2 = ${mid}. values[${mid}] is ${v}, more than ${t}, so the target can only be to the left: hi = ${mid - 1}.`, steps }); hi = mid - 1; }
    }
    frames.push({ lo, hi, mid: null, gone: true, msg: `lo = ${lo} is now past hi = ${hi}: nothing left to search. ${t} isn't in the list.`, steps });
  }
  function draw() {
    const f = frames[k];
    back.disabled = k === 0; next.disabled = k >= frames.length - 1;
    strip.replaceChildren(...values.map((v, i) => {
      const live = i >= f.lo && i <= f.hi && !f.gone, isMid = i === f.mid;
      const tags = [i === f.lo && !f.gone ? "lo" : "", isMid ? "mid" : "", i === f.hi && !f.gone ? "hi" : ""].filter(Boolean).join(" ");
      return h("div", { style: "display:grid;text-align:center;gap:2px" },
        h("span", { style: `min-width:2.4em;padding:.35rem .3rem;border-radius:5px;font:700 .95rem var(--f-code);border:2px solid ${isMid ? (f.found ? "var(--green)" : "var(--ink)") : live ? "var(--blue)" : "var(--line)"};background:${isMid && f.found ? "var(--green-soft)" : live ? "var(--blue-soft)" : "transparent"};color:${live || isMid ? "var(--ink)" : "var(--ink-3)"}` }, v),
        h("span", { style: "font-size:.66rem;color:var(--ink-3)" }, i),
        h("span", { style: "font:700 .66rem var(--f-code);color:var(--blue-ink);min-height:1em" }, tags));
    }));
    info.textContent = f.msg;
    const lin = values.indexOf(t);
    note.textContent = `Binary search: ${f.steps} comparison${f.steps === 1 ? "" : "s"} so far (never more than ${Math.floor(Math.log2(values.length)) + 1} for ${values.length} items). Linear search would need ${lin >= 0 ? lin + 1 : values.length}.`;
  }
  function start() { const v = Number(input.value); if (!Number.isFinite(v)) return; t = v; plan(); k = 0; draw(); }
  go.onclick = start;
  input.onkeydown = e => { if (e.key === "Enter") start(); };
  back.onclick = () => { k--; draw(); };
  next.onclick = () => { k++; draw(); };
  start();
}
