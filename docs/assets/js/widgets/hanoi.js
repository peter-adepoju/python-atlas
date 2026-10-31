// Towers of Hanoi: step through the moves the recursive solution makes, and see which call
// (which size of tower, from which peg to which) each move belongs to.
import { h } from "../site.js?v=055c40ee42";

export default function hanoi(el, { n = 3, max = 6 } = {}) {
  let discs = n, step = 0, moves = [], timer = null;
  const pegNames = ["A", "B", "C"];
  const colours = ["var(--blue)", "var(--green)", "var(--yellow)", "var(--red)", "var(--violet)", "var(--ink-3)"];
  const nSel = h("input", { type: "range", min: 1, max, value: discs, "aria-label": "Number of discs" });
  const nLab = h("span", { class: "w-label" });
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const fwd = h("button", { type: "button", class: "btn btn-step" }, "Next move");
  const play = h("button", { type: "button", class: "btn btn-quiet" }, "Play");
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Reset");
  const board = h("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:.7rem" });
  const info = h("div", { style: "margin-top:.6rem;font:600 .95rem var(--f-code)" });
  const call = h("div", { class: "w-out", style: "margin-top:.4rem;white-space:pre-wrap" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row", style: "align-items:center;flex-wrap:wrap" }, nLab, nSel, back, fwd, play, reset), board, info, call, note);

  function plan() {
    moves = [];
    (function go(k, from, to, spare, depth) {
      if (k === 0) return;
      go(k - 1, from, spare, to, depth + 1);
      moves.push({ disc: k, from, to, size: k, depth });
      go(k - 1, spare, to, from, depth + 1);
    })(discs, 0, 2, 1, 0);
  }
  function state(upto) {
    const pegs = [[], [], []];
    for (let d = discs; d >= 1; d--) pegs[0].push(d);
    for (let i = 0; i < upto; i++) { const m = moves[i]; pegs[m.to].push(pegs[m.from].pop()); }
    return pegs;
  }
  function draw() {
    nLab.textContent = `discs: ${discs}`;
    back.disabled = step === 0; fwd.disabled = step >= moves.length;
    const pegs = state(step), last = step > 0 ? moves[step - 1] : null;
    const height = discs * 22 + 14;
    board.replaceChildren(...pegs.map((p, i) => h("div", { style: "display:grid;justify-items:center" },
      h("div", { style: `position:relative;width:100%;height:${height}px;display:flex;flex-direction:column-reverse;align-items:center;border-bottom:3px solid var(--ink-2)` },
        h("div", { style: `position:absolute;bottom:0;left:50%;width:6px;margin-left:-3px;height:${height - 4}px;background:var(--line);border-radius:3px 3px 0 0` }),
        ...p.map(d => h("div", { style: `position:relative;height:18px;margin-top:4px;width:${20 + d * (70 / discs)}%;border-radius:9px;background:${colours[(d - 1) % colours.length]};${last && last.disc === d ? "outline:3px solid var(--ink);outline-offset:1px" : ""};color:#fff;text-shadow:0 0 3px rgba(0,0,0,.75);font:700 .7rem var(--f-code);display:grid;place-items:center` }, d))),
      h("span", { style: "font:700 .9rem var(--f-code);margin-top:.25rem" }, pegNames[i]))));
    const total = 2 ** discs - 1;
    info.textContent = `move ${step} of ${total}` + (last ? `:  disc ${last.disc} from ${pegNames[last.from]} to ${pegNames[last.to]}` : "");
    if (!last) call.textContent = `hanoi(${discs}, "A", "C", "B")\nMove the whole tower from A to C, using B as the spare.`;
    else call.textContent = `${"  ".repeat(last.depth)}inside a call moving a tower of ${last.size} disc${last.size > 1 ? "s" : ""} (${last.depth === 0 ? "the first call" : last.depth + (last.depth === 1 ? " call" : " calls") + " below the first"})\n` +
      (last.size === 1 ? "A tower of one disc: just move it." : `The ${last.size - 1} smaller disc${last.size > 2 ? "s are" : " is"} out of the way, so disc ${last.disc} can move. Next, the smaller tower goes back on top of it.`);
    note.textContent = step >= total ? `Done in ${total} moves, which is 2 to the power ${discs}, minus 1. No solution uses fewer.` : "Disc 1 (the smallest) moves on every other move.";
  }
  function stop() { clearInterval(timer); timer = null; play.textContent = "Play"; }
  nSel.oninput = () => { stop(); discs = +nSel.value; step = 0; plan(); draw(); };
  back.onclick = () => { stop(); step--; draw(); };
  fwd.onclick = () => { stop(); step++; draw(); };
  reset.onclick = () => { stop(); step = 0; draw(); };
  play.onclick = () => {
    if (timer) return stop();
    if (step >= moves.length) step = 0;
    play.textContent = "Pause";
    timer = setInterval(() => { if (step >= moves.length) return stop(); step++; draw(); }, Math.max(150, 900 - discs * 120));
  };
  plan(); draw();
}
