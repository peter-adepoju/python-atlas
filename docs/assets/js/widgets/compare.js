// Comparison lab: all six comparisons for two values, and how strings are compared letter by letter.
import { h } from "../site.js?v=db382219e3";
import { py } from "../runtime.js?v=db382219e3";

const OPS = ["==", "!=", "<", "<=", ">", ">="];

export default function compare(el, { a = "7", b = "10", tries = [["7", "10"], ["'apple'", "'apricot'"], ["'Zebra'", "'apple'"], ["'10'", "'9'"], ["3", "3.0"], ["'7'", "7"]] } = {}) {
  const ia = h("input", { class: "w-input", value: a, spellcheck: "false", style: "width:10em", "aria-label": "a" });
  const ib = h("input", { class: "w-input", value: b, spellcheck: "false", style: "width:10em", "aria-label": "b" });
  const grid = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.45rem;margin-top:.8rem" });
  const letters = h("div", { style: "margin-top:.8rem" });
  const note = h("p", { class: "w-note" });
  el.append(
    h("div", { class: "w-row" }, h("code", {}, "a ="), ia, h("code", {}, "b ="), ib),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, tries.map(([x, y]) =>
      h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { ia.value = x; ib.value = y; go(); } }, `${x}, ${y}`))),
    grid, letters, note);

  let t;
  async function go() {
    const A = ia.value.trim(), B = ib.value.trim();
    const cells = [];
    let anyErr = "";
    for (const op of OPS) {
      const r = await py.eval(`(${A}) ${op} (${B})`, true);
      const ok = r.value === "True";
      if (r.error) anyErr = r.error;
      cells.push(h("div", {
        class: "panel",
        style: `padding:.5rem .7rem;display:flex;justify-content:space-between;align-items:center;gap:.5rem;${r.error ? "border-color:var(--red);background:var(--red-soft)" : ok ? "border-color:var(--green);background:var(--green-soft)" : ""}`,
      }, h("code", {}, `a ${op} b`), h("strong", { style: "font-family:var(--f-code)" }, r.error ? r.error.split(":")[0] : r.value)));
    }
    grid.replaceChildren(...cells);
    letters.replaceChildren();
    const ta = await py.eval(`type(${A}).__name__`, true), tb = await py.eval(`type(${B}).__name__`, true);
    if (ta.value === "str" && tb.value === "str") {
      const sa = (await py.eval(`${A}`, true)).value, sb = (await py.eval(`${B}`, true)).value;
      let k = 0;
      while (k < sa.length && k < sb.length && sa[k] === sb[k]) k++;
      const row = (s, name) => h("div", { class: "w-row", style: "gap:3px;margin-top:.3rem" }, h("code", { style: "width:1.6em" }, name),
        [...s].map((ch, i) => h("div", {
          style: `min-width:2.1em;text-align:center;padding:.15rem .25rem;border-radius:4px;border:1px solid ${i === k ? "var(--yellow)" : "var(--line)"};background:${i < k ? "var(--sunk)" : i === k ? "var(--yellow-soft)" : "var(--paper)"}`,
        }, h("div", { style: "font:600 1rem var(--f-code)" }, ch === " " ? "␣" : ch), h("div", { style: "font-size:.65rem;color:var(--ink-3)" }, ch.codePointAt(0)))));
      letters.append(h("div", { class: "w-label" }, "Letter by letter, with each character's code number"), row(sa, "a"), row(sb, "b"));
      if (k < sa.length && k < sb.length) {
        note.textContent = `${k === 0 ? "The very first characters already differ." : `The first ${k} character${k === 1 ? " is" : "s are"} the same.`} At position ${k}, '${sa[k]}' (${sa.codePointAt(k)}) and '${sb[k]}' (${sb.codePointAt(k)}) differ, and that one pair decides everything: ${sa.codePointAt(k) < sb.codePointAt(k) ? "a" : "b"} comes first. Capitals (65 to 90) come before lower case (97 to 122), and digits (48 to 57) before both.`;
      } else if (sa.length === sb.length) {
        note.textContent = "Every character matches, so the strings are equal.";
      } else {
        note.textContent = `One string runs out first. When every character so far matches, the shorter string counts as smaller: ${sa.length < sb.length ? "a" : "b"} comes first.`;
      }
    } else if (anyErr) {
      note.textContent = `${anyErr}. == and != work between any two values, but < and > need values that have an order between them, such as two numbers or two strings.`;
    } else if (ta.value && tb.value && ta.value !== tb.value) {
      note.textContent = `a is ${ta.value === "str" || tb.value === "str" ? "a string and b isn't" : `an ${ta.value} and b is a ${tb.value}`}. Numbers of different types compare by value, so 3 == 3.0. A string never equals a number.`;
    } else {
      note.textContent = "Green means True. Exactly one of <, == and > is True for any two numbers.";
    }
  }
  [ia, ib].forEach((x) => x.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 300); }));
  go();
}
