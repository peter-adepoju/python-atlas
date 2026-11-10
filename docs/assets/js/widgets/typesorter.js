// Sort values into their types, then let Python check every answer with type().
import { h } from "../site.js?v=86aca22b42";
import { py } from "../runtime.js?v=86aca22b42";

const BINS = ["int", "float", "str", "bool"];

export default function typesorter(el, { values = ["42", "3.14", '"42"', "True", "-7", "0.0", '"True"', "1e3", "False", "'3.14'", "10 / 2", "10 // 2"] }) {
  const choice = new Map();
  let selected = null;
  const pool = h("div", { style: "display:flex;flex-wrap:wrap;gap:.4rem;min-height:2.6rem;margin:.5rem 0" });
  const bins = h("div", { style: "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem" });
  const note = h("p", { class: "w-note", "aria-live": "polite" }, "Click a value, then click the type you think it has.");
  const check = h("button", { type: "button", class: "btn btn-check" }, "Ask Python");
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Start again");
  el.append(pool, bins, h("div", { class: "w-row", style: "margin-top:.6rem" }, check, reset), note);

  const chip = (v, state) => h("button", {
    type: "button", class: "w-chip",
    style: `cursor:pointer;${selected === v ? "outline:3px solid var(--yellow);" : ""}${state === "ok" ? "border-color:var(--green);background:var(--green-soft);" : state === "no" ? "border-color:var(--red);background:var(--red-soft);" : ""}`,
    onclick: () => { selected = selected === v ? null : v; draw(); },
  }, v);

  let results = {};
  function draw() {
    pool.replaceChildren(...values.filter((v) => !choice.has(v)).map((v) => chip(v)));
    if (!pool.children.length) pool.append(h("span", { class: "muted" }, "All sorted. Ask Python to check."));
    bins.replaceChildren(...BINS.map((b) => {
      const box = h("div", {
        role: "button", tabindex: 0, style: "border:2px dashed var(--line);border-radius:8px;padding:.5rem;min-height:6.5rem;cursor:pointer;background:var(--paper)",
        onclick: () => { if (selected) { choice.set(selected, b); selected = null; results = {}; draw(); } },
        onkeydown: (e) => { if (e.key === "Enter" && selected) { choice.set(selected, b); selected = null; draw(); } },
      }, h("div", { style: "font:700 1rem var(--f-code);margin-bottom:.4rem" }, b));
      const inside = [...choice].filter(([, t]) => t === b).map(([v]) => v);
      box.append(h("div", { style: "display:flex;flex-wrap:wrap;gap:.3rem" }, inside.map((v) => chip(v, results[v] && (results[v] === b ? "ok" : "no")))));
      return box;
    }));
  }
  check.onclick = async () => {
    if (!choice.size) { note.textContent = "Sort at least one value first."; return; }
    let right = 0;
    const wrong = [];
    for (const [v, b] of choice) {
      const r = await py.eval(`type(${v}).__name__`, true);
      results[v] = r.value;
      if (r.value === b) right++; else wrong.push(`${v} is ${r.value}`);
    }
    draw();
    note.textContent = `${right} of ${choice.size} right.` + (wrong.length ? " Python says: " + wrong.join("; ") + "." : " Perfect.");
  };
  reset.onclick = () => { choice.clear(); results = {}; selected = null; note.textContent = "Click a value, then click the type you think it has."; draw(); };
  draw();
}
