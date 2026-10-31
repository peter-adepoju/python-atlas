// How a call's arguments are matched to a function's parameters.
import { h } from "../site.js?v=0064081c78";
import { py } from "../runtime.js?v=0064081c78";

export default function callbind(el, { params = 'name, greeting="Hello"', args = '"Ada"', tries = [] } = {}) {
  const ip = h("input", { class: "w-input", value: params, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "Parameters" });
  const ia = h("input", { class: "w-input", value: args, spellcheck: "false", style: "flex:1 1 220px", "aria-label": "Arguments" });
  const out = h("div", { style: "margin-top:.8rem" });
  const note = h("p", { class: "w-note" });
  el.append(
    h("div", { class: "w-row" }, h("code", {}, "def f("), ip, h("code", {}, "):")),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, h("code", {}, "f("), ia, h("code", {}, ")")),
    tries.length ? h("div", { class: "w-row", style: "margin-top:.4rem" }, tries.map((t) =>
      h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { ia.value = t; go(); } }, `f(${t})`))) : "",
    out, note);
  let t;
  async function go() {
    const r = await py.call("bind_call", ip.value, ia.value);
    if (r.error) {
      out.replaceChildren(h("div", { class: "w-err" }, r.error));
      note.textContent = "Python checks the arguments against the parameters before the body runs a single line. Every parameter without a default needs exactly one value.";
      return;
    }
    out.replaceChildren(h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "parameter"), h("th", {}, "gets"), h("th", {}, "how"))),
      h("tbody", {}, r.rows.map((row) => h("tr", {},
        h("td", { style: "font-family:var(--f-code);font-weight:700" }, row.name),
        h("td", { style: "font-family:var(--f-code)" }, row.value),
        h("td", { style: `color:${row.how.startsWith("by") ? "var(--ink)" : "var(--ink-3)"}` }, row.how))))));
    note.textContent = "Positional arguments fill the parameters from the left. Named arguments go to the parameter with that name. Anything left over takes its default.";
  }
  [ip, ia].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 300); }));
  go();
}
