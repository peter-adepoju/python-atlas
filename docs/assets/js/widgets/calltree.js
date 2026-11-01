// Recursion figure: step through every call and return of a recursive function.
// Left: the call stack (the calls still waiting). Right: the tree of every call so far.
import { h } from "../site.js?v=871ff52039";
import { py } from "../runtime.js?v=871ff52039";

export default function calltree(el, { code, call, calls = [] }) {
  const area = h("textarea", { class: "w-input", spellcheck: "false", rows: Math.max(4, code.split("\n").length), style: "width:100%;font-family:var(--f-code);line-height:1.55;resize:vertical", "aria-label": "Function" });
  area.value = code;
  const callIn = h("input", { class: "w-input", value: call, spellcheck: "false", style: "flex:0 1 220px", "aria-label": "Call" });
  const runBtn = h("button", { type: "button", class: "btn btn-run" }, "Trace");
  const back = h("button", { type: "button", class: "btn btn-quiet" }, "Back");
  const next = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const all = h("button", { type: "button", class: "btn btn-quiet" }, "Show all");
  const counter = h("span", { class: "w-label" });
  const stackBox = h("div", { style: "display:flex;flex-direction:column-reverse;gap:4px;min-height:3rem" });
  const treeBox = h("div", { style: "font:500 .9rem/1.65 var(--f-code);max-height:360px;overflow:auto" });
  const note = h("p", { class: "w-note" });
  el.append(area,
    h("div", { class: "w-row", style: "margin-top:.5rem;align-items:center" }, h("span", { class: "w-label" }, "Call:"), callIn, runBtn,
      ...calls.map((c) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { callIn.value = c; go(); } }, c))),
    h("div", { class: "w-row", style: "margin-top:.5rem;align-items:center" }, back, next, all, counter),
    h("div", { style: "display:grid;grid-template-columns:minmax(170px,1fr) 2fr;gap:1rem;margin-top:.7rem;align-items:start" },
      h("div", {}, h("div", { class: "w-label" }, "The call stack (newest on top)"), stackBox),
      h("div", {}, h("div", { class: "w-label" }, "Every call so far"), treeBox)),
    note);

  let events = [], step = 0, res = null;
  function draw() {
    const shown = events.slice(0, step);
    const label = {}, value = {}, depth = {};
    const stack = [];
    for (const e of shown) {
      if (e.kind === "call") { label[e.id] = e.label; depth[e.id] = e.depth; stack.push(e.id); }
      else { value[e.id] = e.value; stack.pop(); }
    }
    const current = shown.length ? shown[shown.length - 1] : null;
    stackBox.replaceChildren(...stack.map((id, i) => h("div", { style: `padding:.3rem .6rem;border-radius:5px;font:600 .9rem var(--f-code);border:1px solid var(--blue);background:${i === stack.length - 1 ? "var(--yellow-soft)" : "var(--blue-soft)"}` },
      label[id], i === stack.length - 1 ? h("span", { class: "muted", style: "font-weight:400" }, "  running") : h("span", { class: "muted", style: "font-weight:400" }, "  waiting"))));
    if (!stack.length) stackBox.replaceChildren(h("span", { class: "muted" }, step ? "empty: every call has returned" : "empty"));
    const order = shown.filter((e) => e.kind === "call").map((e) => e.id);
    treeBox.replaceChildren(...order.map((id) => {
      const done = id in value, active = stack.includes(id), isNow = current && current.id === id;
      return h("div", { style: `padding-left:${depth[id] * 1.3}em;white-space:nowrap;${isNow ? "background:var(--yellow-soft);border-radius:4px" : ""}` },
        h("span", { style: "color:var(--ink-3)" }, depth[id] ? "└ " : ""),
        h("span", { style: `font-weight:${active ? 700 : 500}` }, label[id]),
        done ? h("span", { style: "color:var(--green)" }, `  returns ${value[id]}`) : h("span", { class: "muted" }, active ? "  …" : ""));
    }));
    counter.textContent = `step ${step} of ${events.length}`;
    back.disabled = step === 0; next.disabled = all.disabled = step >= events.length;
    if (res && res.error && step >= events.length) note.textContent = res.error;
    else if (!current) note.textContent = "Press Next step to make the first call.";
    else if (current.kind === "call") note.textContent = `${current.label} is called. A new frame goes on top of the stack, with its own copy of the parameters. The calls below it wait.`;
    else if (step >= events.length) note.textContent = `Done: the first call returns ${res.result}. Every frame has been taken off the stack.`;
    else note.textContent = `${label[current.id]} returns ${current.value}. Its frame comes off the stack, and the call that was waiting for it carries on with that value.`;
  }
  async function go() {
    res = await py.call("call_tree", area.value, callIn.value);
    events = res.events || []; step = 0;
    if (res.error && !events.length) { note.textContent = res.error; }
    draw();
  }
  next.onclick = () => { step++; draw(); };
  back.onclick = () => { step--; draw(); };
  all.onclick = () => { step = events.length; draw(); };
  runBtn.onclick = go;
  go();
}
