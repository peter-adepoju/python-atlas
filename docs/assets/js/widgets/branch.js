// Which branch runs? An if/elif/else chain with a slider for the value being tested.
// Shows which conditions Python checks, in order, which one wins, and (for numbers)
// a strip of every value coloured by the branch it lands in, so boundaries stand out.
import { h } from "../site.js?v=5b063fa476";
import { py } from "../runtime.js?v=5b063fa476";

const COLOURS = ["var(--blue)", "var(--green)", "var(--violet)", "#c97a1e", "var(--red)", "var(--ink-3)"];

export default function branch(el, {
  name = "score", value = 72, min = 0, max = 100, step = 1,
  branches = [["score >= 70", "grade = 'A'"], ["score >= 60", "grade = 'B'"], ["score >= 50", "grade = 'C'"], [null, "grade = 'F'"]],
  chain = true, strip = true,
} = {}) {
  const slider = h("input", { type: "range", min, max, step, value, style: "flex:1 1 220px", "aria-label": name });
  const num = h("input", { type: "number", class: "w-input", min, max, step, value, style: "width:6em", "aria-label": name });
  const code = h("pre", { class: "w-out", style: "margin:.8rem 0 0;line-height:1.75" });
  const flow = h("div", { style: "display:grid;gap:.4rem;margin-top:.8rem" });
  const bar = h("div", { style: "margin-top:.9rem" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row" }, h("code", {}, `${name} =`), num, slider),
    h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;align-items:start" }, code, flow),
    ...(strip && chain ? [bar] : []), note);

  const kw = (i) => (branches[i][0] === null ? "else" : !chain || i === 0 ? "if" : "elif");
  let stripData = null;

  async function makeStrip() {
    if (!strip || !chain) return;
    const conds = branches.filter((b) => b[0] !== null).map((b) => `(lambda ${name}: ${b[0]})`);
    const r = await py.eval(`__import__('json').dumps([next((i for i, f in enumerate([${conds.join(", ")}]) if f(v)), ${conds.length}) for v in [${min} + k * ${step} for k in range(int((${max} - ${min}) / ${step}) + 1)]])`, true);
    if (!r.error) stripData = JSON.parse(r.value);
  }

  async function go() {
    const v = Number(num.value);
    const results = [];
    for (const [cond] of branches) {
      if (cond === null) { results.push(null); continue; }
      const r = await py.eval(`(lambda ${name}: bool(${cond}))(${v})`, true);
      results.push(r.error ? r.error : r.value === "True");
    }
    // Which branches are checked, and which run?
    const state = branches.map(() => "skip");
    let won = -1;
    for (let i = 0; i < branches.length; i++) {
      if (chain && won >= 0) break;
      if (branches[i][0] === null) { if (won < 0) { state[i] = "run"; won = i; } break; }
      const res = results[i];
      if (res === true) { state[i] = "run"; if (won < 0) won = i; } else state[i] = typeof res === "string" ? "error" : "false";
    }
    code.replaceChildren(...branches.flatMap(([cond, body], i) => {
      const head = cond === null ? "else:" : `${kw(i)} ${cond}:`;
      const on = state[i] === "run";
      return [
        h("div", { style: `padding:0 .4rem;border-radius:4px;${state[i] === "skip" ? "opacity:.45" : ""}${on ? ";background:var(--yellow-soft);box-shadow:inset 3px 0 var(--yellow)" : ""}` }, head),
        h("div", { style: `padding:0 .4rem;border-radius:4px;${on ? "background:var(--yellow-soft);box-shadow:inset 3px 0 var(--yellow)" : "opacity:.45"}` }, "    " + body),
      ];
    }));
    flow.replaceChildren(...branches.map(([cond, body], i) => {
      const s = state[i];
      const label = s === "run" ? (cond === null ? "runs (nothing above was True)" : "True, so this runs") : s === "false" ? "False" : s === "error" ? results[i] : "not checked";
      return h("div", { class: "panel", style: `padding:.45rem .7rem;border-left:4px solid ${s === "run" ? "var(--yellow)" : s === "false" ? "var(--line)" : s === "error" ? "var(--red)" : "transparent"};${s === "skip" ? "opacity:.5" : ""}` },
        h("div", { style: "display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap" },
          h("code", {}, cond === null ? "else" : cond), h("span", { style: `font-size:.85rem;font-weight:700;color:${s === "run" ? "var(--ink)" : "var(--ink-3)"}` }, `${i + 1}. ${label}`)));
    }));
    if (strip && chain && stripData) {
      const n = stripData.length;
      const pos = Math.round((v - min) / step);
      bar.replaceChildren(h("div", { class: "w-label" }, `Every value from ${min} to ${max}, coloured by the branch it lands in`),
        h("div", { style: "position:relative;display:flex;height:18px;border-radius:4px;overflow:hidden;margin-top:.3rem" },
          stripData.map((b, k) => h("span", { title: `${name} = ${+(min + k * step).toFixed(6)}: branch ${b + 1}`, style: `flex:1;background:${COLOURS[b % COLOURS.length]};opacity:${k === pos ? 1 : .55}` }))),
        h("div", { style: "position:relative;height:1.4em" },
          h("span", { style: `position:absolute;left:${(pos + .5) / n * 100}%;transform:translateX(-50%);font:700 .8rem var(--f-code)` }, "▲ " + v)),
        h("div", { class: "w-row", style: "gap:.3rem 1rem;font-size:.85rem" }, branches.map(([c, body], i) =>
          h("span", {}, h("i", { style: `display:inline-block;width:.8em;height:.8em;border-radius:2px;margin-right:.35em;background:${COLOURS[i % COLOURS.length]}` }), body))));
    }
    const ran = state.map((s, i) => s === "run" ? i : -1).filter((i) => i >= 0);
    const checked = state.filter((s) => s === "false" || s === "run").length - (branches[won] && branches[won][0] === null ? 1 : 0);
    note.textContent = chain
      ? `Python checked ${checked} condition${checked === 1 ? "" : "s"}, top to bottom, and ran the first branch whose condition was True. Everything after it is skipped, even conditions that would also be True.`
      : `With separate ifs, every condition is checked, and ${ran.length === 1 ? "one block runs" : `${ran.length} blocks run`}. That's the difference from elif.`;
  }
  slider.oninput = () => { num.value = slider.value; go(); };
  num.oninput = () => { slider.value = num.value; go(); };
  makeStrip().then(go);
}
