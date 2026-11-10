// Is this a good variable name? Python's own rules decide, live.
import { h } from "../site.js?v=b54d8b61c9";
import { py } from "../runtime.js?v=b54d8b61c9";

export default function namecheck(el, { tries = ["total_price", "2nd_place", "first name", "high-score", "class", "list", "userName", "_hidden", "café", "π"] }) {
  const input = h("input", { class: "w-input", value: tries[0], spellcheck: "false", "aria-label": "A variable name", style: "flex:1 1 200px;font-size:1.1rem" });
  const verdict = h("div", { style: "margin-top:.6rem;font-weight:700;font-size:1.05rem", "aria-live": "polite" });
  const list = h("ul", { style: "margin:.4rem 0 0;padding-left:1.2rem" });
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Name"), input, h("code", {}, "= 42")),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, tries.map((x) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { input.value = x; go(); } }, x))),
    verdict, list);
  let t;
  async function go() {
    const r = await py.call("name_check", input.value);
    verdict.textContent = r.ok ? (r.warnings.length ? "Allowed, but think twice." : "A good name.") : "Python won't accept this name.";
    verdict.style.color = r.ok ? (r.warnings.length ? "var(--ink)" : "var(--green)") : "var(--red)";
    list.replaceChildren(...[...r.issues, ...r.warnings].map((m) => h("li", {}, m)));
  }
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 250); });
  go();
}
