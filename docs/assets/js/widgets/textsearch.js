// Naive substring search: slide the pattern along the text one position at a time,
// comparing character by character until a mismatch or a full match.
import { h, reducedMotion } from "../site.js?v=871ff52039";

export default function textsearch(el, { text = "abracadabra", pattern = "abra" } = {}) {
  const it = h("input", { class: "w-input", value: text, spellcheck: "false", style: "flex:1 1 240px", "aria-label": "Text" });
  const ip = h("input", { class: "w-input", value: pattern, spellcheck: "false", style: "width:9em", "aria-label": "Pattern" });
  const board = h("div", { style: "overflow-x:auto;margin-top:.8rem;padding-bottom:.3rem" });
  const step = h("button", { type: "button", class: "btn btn-step" }, "Step");
  const play = h("button", { type: "button", class: "btn btn-quiet" }, "Play");
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Reset");
  const stat = h("div", { style: "font:600 .95rem var(--f-code);margin-top:.5rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, "text"), it, h("code", {}, "pattern"), ip),
    board, h("div", { class: "w-row", style: "margin-top:.6rem" }, step, play, reset), stat, note);

  // Precompute every comparison as a list of states.
  let states = [], k = 0, timer = null;
  function build() {
    const T = it.value, P = ip.value;
    states = [];
    let comparisons = 0;
    const found = [];
    if (P.length) for (let i = 0; i + P.length <= T.length; i++) {
      let j = 0;
      while (j < P.length) {
        comparisons++;
        const ok = T[i + j] === P[j];
        states.push({ i, j, ok, comparisons, found: [...found] });
        if (!ok) break;
        j++;
      }
      if (j === P.length) { found.push(i); states.push({ i, j: P.length, match: true, comparisons, found: [...found] }); }
    }
    states.push({ done: true, comparisons, found: [...found] });
    k = 0;
    draw();
  }
  const cell = (ch, style) => h("span", { style: `display:inline-grid;place-items:center;width:1.7em;height:1.9em;margin-right:2px;border-radius:4px;font:600 .95rem var(--f-code);${style}` }, ch === " " ? "␣" : ch);
  function draw() {
    const T = it.value, P = ip.value, s = states[k] || states[states.length - 1];
    const inFound = (x) => s.found.some((f) => x >= f && x < f + P.length);
    const rowT = h("div", {}, [...T].map((ch, x) => {
      let st = "border:1px solid var(--line);";
      if (inFound(x)) st += "background:var(--green-soft);border-color:var(--green);";
      if (!s.done && x >= s.i && x < s.i + P.length) st += "box-shadow:inset 0 -3px var(--blue);";
      if (!s.done && !s.match && x === s.i + s.j) st += s.ok ? "background:var(--blue-soft);" : "background:var(--red-soft);border-color:var(--red);";
      return cell(ch, st);
    }));
    const rowI = h("div", { style: "margin-top:2px" }, [...T].map((_, x) => h("span", { style: "display:inline-block;width:calc(1.7 * .95rem);margin-right:2px;text-align:center;font-size:.65rem;color:var(--ink-3)" }, String(x))));
    const rowP = h("div", { style: "margin-top:.5rem;white-space:nowrap" },
      h("span", { style: `display:inline-block;font:600 .95rem var(--f-code);width:calc(${s.done ? 0 : s.i} * (1.7em + 2px))` }),
      ...(s.done ? [] : [...P].map((ch, y) => cell(ch, `border:1px solid var(--blue);${!s.match && y === s.j ? (s.ok ? "background:var(--blue-soft);" : "background:var(--red-soft);border-color:var(--red);") : y < s.j || s.match ? "background:var(--green-soft);" : ""}`))));
    board.replaceChildren(rowT, rowI, rowP);
    stat.textContent = s.done ? `Finished: ${s.comparisons} character comparisons; found at ${s.found.length ? s.found.join(", ") : "no positions"}.`
      : s.match ? `Match at position ${s.i}!` : `Position ${s.i}: comparing text[${s.i + s.j}] '${T[s.i + s.j]}' with pattern[${s.j}] '${P[s.j]}': ${s.ok ? "same" : "different, so slide on"}`;
    note.textContent = "The pattern slides one place at a time. At each place, Python compares characters from the left and gives up at the first difference. This is what in and .find() do for you, with some clever speed-ups.";
    step.disabled = k >= states.length - 1;
  }
  const stopPlay = () => { clearInterval(timer); timer = null; play.textContent = "Play"; };
  step.onclick = () => { stopPlay(); k = Math.min(states.length - 1, k + 1); draw(); };
  play.onclick = () => {
    if (timer) return stopPlay();
    if (k >= states.length - 1) k = 0;
    play.textContent = "Pause";
    timer = setInterval(() => { if (k >= states.length - 1) return stopPlay(); k++; draw(); }, reducedMotion() ? 700 : 350);
  };
  reset.onclick = () => { stopPlay(); k = 0; draw(); };
  [it, ip].forEach((x) => x.addEventListener("input", () => { stopPlay(); build(); }));
  build();
}
