// Sliding window: a window of k items moves along a list. Each step adds the item coming in and
// subtracts the item going out, instead of adding the whole window up again.
import { h } from "../site.js?v=86aca22b42";

export default function slidewindow(el, { values = [4, 2, 12, 3, 8, 1, 7, 9, 2, 5], k = 3 } = {}) {
  let pos = 0, size = k;
  const strip = h("div", { style: "display:flex;flex-wrap:wrap;gap:4px;margin-top:.6rem" });
  const info = h("div", { style: "margin-top:.6rem;font:600 .95rem var(--f-code)" });
  const work = h("div", { class: "w-out", style: "margin-top:.5rem;white-space:pre-wrap" });
  const note = h("p", { class: "w-note" });
  const kSel = h("input", { type: "range", min: 1, max: values.length, value: size, "aria-label": "Window size" });
  const kLab = h("span", { class: "w-label" });
  const prev = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const next = h("button", { type: "button", class: "btn btn-step" }, "Slide right");
  el.append(h("div", { class: "w-row", style: "align-items:center" }, kLab, kSel, prev, next), strip, info, work, note);
  const sumOf = (a, b) => values.slice(a, b).reduce((s, x) => s + x, 0);
  function draw() {
    kLab.textContent = `window size k = ${size}`;
    const last = values.length - size;
    pos = Math.max(0, Math.min(pos, last));
    prev.disabled = pos === 0; next.disabled = pos >= last;
    let best = -Infinity, bestAt = 0;
    for (let i = 0; i <= last; i++) { const s = sumOf(i, i + size); if (s > best) { best = s; bestAt = i; } }
    const sum = sumOf(pos, pos + size);
    strip.replaceChildren(...values.map((v, i) => {
      const inWin = i >= pos && i < pos + size;
      const leaving = pos > 0 && i === pos - 1, entering = pos > 0 && i === pos + size - 1;
      return h("div", { style: "display:grid;text-align:center" },
        h("span", { style: `min-width:2.4em;padding:.35rem .4rem;border-radius:5px;font:700 1rem var(--f-code);border:2px solid ${inWin ? "var(--blue)" : "var(--line)"};background:${entering ? "var(--green-soft)" : inWin ? "var(--blue-soft)" : leaving ? "var(--red-soft)" : "transparent"};${leaving ? "text-decoration:line-through" : ""}` }, v),
        h("span", { style: "font-size:.68rem;color:var(--ink-3)" }, i));
    }));
    info.textContent = `window ${pos} to ${pos + size - 1}:  sum = ${sum}    (the best of all the windows: ${best}, starting at ${bestAt})`;
    if (pos === 0) work.textContent = `First window: add up all ${size} items.\n${values.slice(0, size).join(" + ")} = ${sum}`;
    else work.textContent = `Slide: take away the item leaving (${values[pos - 1]}), add the item arriving (${values[pos + size - 1]}).\n${sumOf(pos - 1, pos - 1 + size)} - ${values[pos - 1]} + ${values[pos + size - 1]} = ${sum}`;
    note.textContent = `Each slide costs two operations, however big the window. Adding every window up from scratch would cost ${size} each time.`;
  }
  kSel.oninput = () => { size = +kSel.value; draw(); };
  prev.onclick = () => { pos--; draw(); };
  next.onclick = () => { pos++; draw(); };
  draw();
}
