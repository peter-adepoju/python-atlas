// Expression stepper: Python evaluates an expression one small step at a time.
import { h, reducedMotion } from "../site.js?v=db382219e3";
import { py } from "../runtime.js?v=db382219e3";

function highlighted(text, span) {
  if (!span) return document.createTextNode(text);
  const [a, b] = span;
  return h("span", {}, text.slice(0, a), h("mark", { class: "hl" }, text.slice(a, b)), text.slice(b));
}

export default async function stepper(el, { exprs = [], vars = {} }) {
  const input = h("input", { class: "w-input", type: "text", value: exprs[0] || "2 + 3 * 4", "aria-label": "Expression", spellcheck: "false", style: "flex:1 1 260px" });
  const pick = exprs.length > 1 ? h("select", { class: "w-input", "aria-label": "Choose an example", onchange: (e) => { input.value = e.target.value; reset(); } },
    exprs.map((x) => h("option", { value: x }, x))) : null;
  const nextBtn = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const playBtn = h("button", { type: "button", class: "btn btn-quiet" }, "Play all");
  const resetBtn = h("button", { type: "button", class: "btn btn-quiet" }, "Start again");
  const ladder = h("ol", { class: "st-ladder", "aria-live": "polite" });
  const varsLine = Object.keys(vars).length
    ? h("p", { class: "w-note" }, "Names already set: ", ...Object.entries(vars).map(([k, v]) => h("code", {}, `${k} = ${JSON.stringify(v)}`)), " ")
    : null;
  el.append(
    h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Expression"), input, pick),
    varsLine || "",
    h("div", { class: "w-row", style: "margin-top:.6rem" }, nextBtn, playBtn, resetBtn),
    ladder,
    h("p", { class: "w-note" }, "Yellow marks the part Python works out next. Type your own expression to try it."));

  let steps = [], i = -1, timer = null;
  async function load() {
    const r = await py.expr(input.value, vars);
    steps = r.steps || [];
    if (r.error && !steps.length) { ladder.replaceChildren(h("li", { class: "is-err" }, r.error)); return false; }
    return true;
  }
  function show() {
    [...ladder.children].forEach((li) => li.classList.remove("is-now"));
    const s = steps[i];
    const li = h("li", { class: s.final ? "is-final" : s.error ? "is-err" : "is-now" }, highlighted(s.text, s.final ? null : s.span),
      h("span", { class: "st-note" }, s.final ? "The final value" : s.note));
    ladder.append(li);
  }
  async function next() {
    if (i === -1 && !(await load())) return;
    if (i >= steps.length - 1) { stop(); return; }
    i++; show();
    if (i >= steps.length - 1) { nextBtn.disabled = true; stop(); }
  }
  function stop() { clearInterval(timer); timer = null; playBtn.textContent = "Play all"; }
  function reset() { stop(); i = -1; steps = []; ladder.replaceChildren(); nextBtn.disabled = false; }
  nextBtn.onclick = next;
  resetBtn.onclick = reset;
  playBtn.onclick = async () => {
    if (timer) return stop();
    if (i >= steps.length - 1 && steps.length) reset();
    playBtn.textContent = "Pause";
    await next();
    timer = setInterval(next, reducedMotion() ? 1500 : 1100);
  };
  input.addEventListener("input", reset);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") next(); });
}
