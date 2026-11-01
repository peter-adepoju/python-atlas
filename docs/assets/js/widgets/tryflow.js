// try/except flow: a program with try and except, run on an input you choose. Lines that ran
// are marked, lines that were skipped are faded, and the line that raised is flagged.
import { h } from "../site.js?v=871ff52039";
import { py } from "../runtime.js?v=871ff52039";

const CODE = `text = input("Number: ")
try:
    n = int(text)
    result = 100 / n
    print("100 /", n, "=", result)
except ValueError:
    print("That isn't a whole number.")
except ZeroDivisionError:
    print("Can't divide by zero.")
else:
    print("No problems.")
finally:
    print("Done.")`;

export default function tryflow(el, { code = CODE, tries = ["4", "abc", "0", "2.5"] } = {}) {
  const inp = h("input", { class: "w-input", value: tries[0], spellcheck: "false", style: "flex:0 1 160px", "aria-label": "Input" });
  const listing = h("div", { style: "margin-top:.7rem;font:500 .92rem/1.7 var(--f-code);border:1px solid var(--line);border-radius:var(--radius-s);padding:.4rem 0;overflow-x:auto" });
  const out = h("pre", { class: "w-out", style: "margin:.6rem 0 0" });
  const note = h("p", { class: "w-note" });
  el.append(h("div", { class: "w-row", style: "align-items:center" }, h("span", { class: "w-label" }, "Type the input:"), inp,
    ...tries.map((t) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { inp.value = t; go(); } }, JSON.stringify(t)))),
    listing, out, note);
  const lines = code.split("\n");
  let timer;
  async function go() {
    const r = await py.call("trace_table", code, [inp.value]);
    const ran = new Set(r.rows.map((x) => x.line));
    // Python doesn't report "try:", "else:" and "finally:" lines themselves; mark them by their bodies.
    lines.forEach((src, i) => { if (/^\s*(try|else|finally)\s*:/.test(src) && ran.has(i + 2)) ran.add(i + 1); });
    const raised = new Set();
    r.rows.forEach((row, i) => { const nx = r.rows[i + 1]; if (nx && /^\s*except\b/.test(nx.src) && !/^\s*except\b/.test(row.src)) raised.add(row.line); });
    let uncaught = null;
    if (r.error && r.rows.length) { uncaught = r.rows[r.rows.length - 1].line; raised.add(uncaught); }
    // An except line is always checked when an error reaches it; it matched if its body ran.
    const isExcept = (n) => /^\s*except\b/.test(lines[n - 1] || "");
    const matched = [...ran].filter((n) => isExcept(n) && ran.has(n + 1));
    listing.replaceChildren(...lines.map((src, i) => {
      const n = i + 1, boom = raised.has(n);
      const checkedOnly = isExcept(n) && ran.has(n) && !matched.includes(n);
      const did = ran.has(n) && !checkedOnly;
      const tag = boom ? "raised" : checkedOnly ? "checked, no match" : isExcept(n) && did ? "matched" : did ? "ran" : "";
      return h("div", { style: `display:flex;gap:.8rem;padding:0 .7rem;white-space:pre;${boom ? "background:var(--red-soft)" : did ? "background:var(--green-soft)" : checkedOnly ? "" : "opacity:.45"}` },
        h("span", { style: "color:var(--ink-3);min-width:1.5em;text-align:right" }, n),
        h("span", { style: "flex:1" }, src || " "),
        h("span", { style: `font:700 .72rem var(--f-body);text-transform:uppercase;letter-spacing:.04em;align-self:center;color:${boom ? "var(--red)" : checkedOnly ? "var(--ink-3)" : "var(--green)"}` }, tag));
    }));
    out.textContent = r.rows.map((x) => x.out).join("") + (r.error ? r.error : "");
    const which = matched.length ? lines[matched[0] - 1].trim() : null;
    if (r.error) note.textContent = "No except matched this error, so it wasn't handled: the finally block still ran, then the program crashed.";
    else if (which) note.textContent = `The red line raised an error. Python skipped the rest of the try block, checked each except in order, and ran the first one that matches (${which}). The else block was skipped; finally always runs.`;
    else note.textContent = "Nothing went wrong: every line of the try block ran, no except block ran, then else, then finally.";
  }
  inp.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(go, 350); });
  go();
}
