// Sorting, step by step: bars for the values, the two being compared, swaps and the part known
// to be sorted. Counts comparisons and moves so the algorithms can be compared on the same data.
import { h } from "../site.js?v=db382219e3";

function framesFor(algo, start) {
  const a = start.slice(), out = [];
  let comps = 0, moves = 0;
  const snap = (hl, done, msg, extra = {}) => out.push({ a: a.slice(), hl, done: done.slice ? done.slice() : done, msg, comps, moves, ...extra });
  const n = a.length;
  if (algo === "selection") {
    const done = [];
    snap([], done, "Selection sort: find the smallest item left, and swap it into the next place.");
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) {
        comps++;
        if (a[j] < a[m]) { m = j; snap([j, m], done, `Compare ${a[j]} with the smallest so far: ${a[j]} is the new smallest.`, { mark: m }); }
        else snap([j, m], done, `Compare ${a[j]} with the smallest so far, ${a[m]}: keep ${a[m]}.`, { mark: m });
      }
      if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; moves++; }
      done.push(i);
      snap([i], done, m !== i ? `Swap the smallest, ${a[i]}, into position ${i}. Positions 0 to ${i} are now final.` : `${a[i]} is already in position ${i}. Positions 0 to ${i} are now final.`);
    }
    done.push(n - 1); snap([], done, "Sorted. The last item is in place once all the others are.");
  } else if (algo === "insertion") {
    snap([], [0], "Insertion sort: the left part is sorted. Take the next item and slide it left into place.");
    for (let i = 1; i < n; i++) {
      let j = i;
      const pre = [...Array(i).keys()];
      snap([i], pre, `Take ${a[i]} and insert it into the sorted part on its left.`);
      while (j > 0) {
        comps++;
        if (a[j - 1] > a[j]) {
          [a[j - 1], a[j]] = [a[j], a[j - 1]]; moves++;
          snap([j - 1, j], pre, `${a[j]} is bigger than ${a[j - 1]}, so they swap.`);
          j--;
        } else { snap([j - 1, j], pre, `${a[j - 1]} is not bigger than ${a[j]}: ${a[j]} has found its place.`); break; }
      }
      snap([], [...Array(i + 1).keys()], `Positions 0 to ${i} are sorted (not yet final: later items may slot in between).`);
    }
    snap([], [...Array(n).keys()], "Sorted.");
  } else if (algo === "merge") {
    snap([], [], "Merge sort: split the list in halves until each piece has one item, then merge pieces back together in order.");
    const range = (a0, b0) => [...Array(b0 - a0).keys()].map(x => x + a0);
    (function sort(lo, hi, depth) {
      if (hi - lo <= 1) return;
      const mid = (lo + hi) >> 1;
      snap(range(lo, hi), [], `Split positions ${lo} to ${hi - 1} into ${lo} to ${mid - 1} and ${mid} to ${hi - 1}.`, { band: [lo, hi] });
      sort(lo, mid, depth + 1); sort(mid, hi, depth + 1);
      const left = a.slice(lo, mid), right = a.slice(mid, hi);
      let i = 0, j = 0, k = lo;
      while (i < left.length && j < right.length) {
        comps++;
        const takeLeft = left[i] <= right[j];
        a[k] = takeLeft ? left[i++] : right[j++]; moves++;
        snap([k], range(lo, k + 1), `Merging ${lo} to ${hi - 1}: ${takeLeft ? left[i - 1] + " (left) <= " + right[j] : right[j - 1] + " (right) < " + left[i]}, so ${a[k]} goes next.`, { band: [lo, hi] });
        k++;
      }
      while (i < left.length) { a[k++] = left[i++]; moves++; }
      while (j < right.length) { a[k++] = right[j++]; moves++; }
      snap([], range(lo, hi), `Positions ${lo} to ${hi - 1} are now sorted.`, { band: [lo, hi] });
    })(0, n, 0);
    snap([], range(0, n), "Sorted.");
  } else if (algo === "quick") {
    const done = [];
    snap([], done, "Quicksort: pick a pivot (here the last item), move smaller items to its left and the rest to its right, then sort each side the same way.");
    (function sort(lo, hi) {
      if (lo >= hi) { if (lo === hi) done.push(lo); return; }
      const pivot = a[hi];
      let i = lo;
      snap([hi], done, `Pivot ${pivot} for positions ${lo} to ${hi}.`, { mark: hi, band: [lo, hi + 1] });
      for (let j = lo; j < hi; j++) {
        comps++;
        if (a[j] < pivot) {
          if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; moves++; }
          snap([i, j], done, `${a[i]} < ${pivot}: it joins the smaller side (position ${i}).`, { mark: hi, band: [lo, hi + 1] });
          i++;
        } else snap([j], done, `${a[j]} >= ${pivot}: it stays on the bigger side.`, { mark: hi, band: [lo, hi + 1] });
      }
      if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; moves++; }
      done.push(i);
      snap([i], done, `The pivot ${pivot} goes between the two sides, at position ${i}: its final place.`, { band: [lo, hi + 1] });
      sort(lo, i - 1); sort(i + 1, hi);
    })(0, n - 1);
    snap([], [...Array(n).keys()], "Sorted.");
  } else {
    const done = [];
    snap([], done, "Bubble sort: compare neighbours left to right, swapping any pair in the wrong order. The biggest item bubbles to the end.");
    for (let end = n - 1; end > 0; end--) {
      let swapped = false;
      for (let j = 0; j < end; j++) {
        comps++;
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; moves++; swapped = true; snap([j, j + 1], done, `${a[j + 1]} > ${a[j]}: swap.`); }
        else snap([j, j + 1], done, `${a[j]} <= ${a[j + 1]}: leave them.`);
      }
      done.push(end);
      if (!swapped) { for (let k = 0; k < end; k++) done.push(k); snap([], done, "A whole pass with no swaps: the list is sorted, so stop early."); return out; }
      snap([], done, `End of a pass: ${a[end]} has bubbled to position ${end}, its final place.`);
    }
    done.push(0); snap([], done, "Sorted.");
  }
  return out;
}

export default function sortviz(el, { algos = ["selection", "insertion", "bubble"], values = [5, 2, 9, 1, 7, 3, 8, 6], presets = true } = {}) {
  let algo = algos[0], data = values.slice(), frames = [], k = 0, timer = null;
  const names = { selection: "Selection", insertion: "Insertion", bubble: "Bubble", merge: "Merge", quick: "Quick" };
  const pick = h("div", { class: "w-row", style: "flex-wrap:wrap;gap:.35rem" });
  const dataRow = h("div", { class: "w-row", style: "flex-wrap:wrap;gap:.35rem;margin-top:.4rem" });
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const next = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const play = h("button", { type: "button", class: "btn btn-quiet" }, "Play");
  const bars = h("div", { style: "display:flex;align-items:flex-end;gap:4px;height:150px;margin-top:.7rem" });
  const msg = h("div", { class: "w-out", style: "margin-top:.6rem;white-space:pre-wrap;min-height:3em" });
  const count = h("p", { class: "w-note", style: "font-weight:600" });
  el.append(pick, dataRow, h("div", { class: "w-row", style: "margin-top:.5rem" }, back, next, play), bars, msg, count);
  const stop = () => { clearInterval(timer); timer = null; play.textContent = "Play"; };
  function reset() { stop(); frames = framesFor(algo, data); k = 0; draw(); }
  function draw() {
    pick.replaceChildren(...(algos.length > 1 ? algos.map(a => { const b = h("button", { type: "button", class: "btn " + (a === algo ? "btn-step" : "btn-quiet"), style: "padding:.25rem .6rem" }, names[a]); b.onclick = () => { algo = a; reset(); }; return b; }) : []));
    if (presets) {
      const sets = { "Mixed": values, "Sorted": values.slice().sort((x, y) => x - y), "Reversed": values.slice().sort((x, y) => y - x), "Nearly sorted": (() => { const s = values.slice().sort((x, y) => x - y); [s[1], s[2]] = [s[2], s[1]]; return s; })() };
      dataRow.replaceChildren(h("span", { class: "w-label" }, "data:"), ...Object.entries(sets).map(([name, arr]) => { const on = arr.join() === data.join(); const b = h("button", { type: "button", class: "btn " + (on ? "btn-step" : "btn-quiet"), style: "padding:.2rem .5rem;font-size:.8rem" }, name); b.onclick = () => { data = arr.slice(); reset(); }; return b; }));
    }
    const f = frames[k], max = Math.max(...f.a);
    back.disabled = k === 0; next.disabled = k >= frames.length - 1;
    const done = new Set(f.done);
    const inBand = (i) => !f.band || (i >= f.band[0] && i < f.band[1]);
    bars.replaceChildren(...f.a.map((v, i) => h("div", { style: `flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0;opacity:${inBand(i) ? 1 : .35}` },
      h("span", { style: "font:700 .75rem var(--f-code);margin-bottom:2px" }, v),
      h("div", { style: `width:100%;height:${12 + 84 * v / max}%;border-radius:4px 4px 0 0;background:${f.hl.includes(i) ? "var(--yellow)" : f.mark === i ? "var(--red)" : done.has(i) ? "var(--green)" : "var(--blue)"};${f.hl.includes(i) ? "outline:2px solid var(--ink);" : ""}` }))));
    msg.textContent = f.msg;
    count.textContent = `${names[algo]} sort: ${f.comps} comparison${f.comps === 1 ? "" : "s"}, ${f.moves} ${algo === "merge" ? "write" : "swap"}${f.moves === 1 ? "" : "s"} so far.`;
  }
  back.onclick = () => { stop(); k--; draw(); };
  next.onclick = () => { stop(); k++; draw(); };
  play.onclick = () => {
    if (timer) return stop();
    if (k >= frames.length - 1) k = 0;
    play.textContent = "Pause";
    timer = setInterval(() => { if (k >= frames.length - 1) return stop(); k++; draw(); }, 450);
  };
  reset();
}
