// Counting sort: tally each value into a box, then read the boxes out in order. No item is ever
// compared with another.
import { h } from "../site.js?v=8fe38f9496";

export default function countsort(el, { values = [3, 1, 4, 1, 5, 2, 0, 4, 1, 3], max = 5 } = {}) {
  const frames = [];
  const counts = Array(max + 1).fill(0);
  frames.push({ i: -1, counts: counts.slice(), out: [], msg: `Make ${max + 1} boxes, one for each possible value 0 to ${max}, all starting at 0.` });
  values.forEach((v, i) => { counts[v]++; frames.push({ i, counts: counts.slice(), out: [], hot: v, msg: `Item ${i} is ${v}: add 1 to box ${v}.` }); });
  const out = [];
  for (let v = 0; v <= max; v++) {
    if (!counts[v]) { frames.push({ i: values.length, counts: counts.slice(), out: out.slice(), hot: v, msg: `Box ${v} is empty: nothing to write.` }); continue; }
    for (let c = 0; c < counts[v]; c++) out.push(v);
    frames.push({ i: values.length, counts: counts.slice(), out: out.slice(), hot: v, msg: `Box ${v} holds ${counts[v]}: write ${v} ${counts[v]} time${counts[v] === 1 ? "" : "s"}.` });
  }
  frames.push({ i: values.length, counts: counts.slice(), out: out.slice(), msg: `Sorted, with ${values.length} steps to count and ${max + 1} boxes to read: O(n + k), and not one comparison.` });
  let k = 0;
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const next = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const row = (label) => { const r = h("div", { style: "display:flex;flex-wrap:wrap;gap:4px;align-items:center" }); return [h("div", { class: "w-label", style: "margin-top:.6rem" }, label), r]; };
  const [l1, inRow] = row("input"), [l2, boxRow] = row("boxes (value: count)"), [l3, outRow] = row("output");
  const msg = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap" });
  el.append(h("div", { class: "w-row" }, back, next), l1, inRow, l2, boxRow, l3, outRow, msg);
  const cell = (txt, on, done) => h("span", { style: `min-width:2.2em;text-align:center;padding:.3rem .35rem;border-radius:5px;font:700 .9rem var(--f-code);border:2px solid ${on ? "var(--ink)" : "var(--line)"};background:${on ? "var(--yellow-soft)" : done ? "var(--blue-soft)" : "transparent"}` }, txt);
  function draw() {
    const f = frames[k];
    back.disabled = k === 0; next.disabled = k === frames.length - 1;
    inRow.replaceChildren(...values.map((v, i) => cell(v, i === f.i, i < f.i)));
    boxRow.replaceChildren(...f.counts.map((c, v) => cell(`${v}: ${c}`, v === f.hot, c > 0)));
    outRow.replaceChildren(...(f.out.length ? f.out.map((v) => cell(v, false, true)) : [h("span", { class: "w-note" }, "(nothing yet)")]));
    msg.textContent = f.msg;
  }
  back.onclick = () => { k--; draw(); };
  next.onclick = () => { k++; draw(); };
  draw();
}
