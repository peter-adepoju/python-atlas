// Read an error message like a detective: run broken code and label each part of the real error.
import { h } from "../site.js?v=97b2d34bb1";
import { py } from "../runtime.js?v=97b2d34bb1";

const SAMPLES = {
  "A misspelt name": 'message = "Hello"\nprint(mesage)',
  "A missing quote": 'print("Hello)',
  "Text plus a number": 'age = 12\nprint("I am " + age)',
  "Dividing by zero": "slices = 8\npeople = 0\nprint(slices / people)",
};

export default function traceback(el, { samples, programs = null } = {}) {
  // programs: {name: code} to use instead of the built-in samples
  const SRC = programs || SAMPLES;
  samples = samples || Object.keys(SRC);
  const pick = h("select", { class: "w-input", "aria-label": "Choose a broken program" }, samples.map((s) => h("option", { value: s }, s)));
  const code = h("pre", { class: "w-out" });
  const tb = h("div", { class: "w-out", style: "background:#141c2e;color:#e8edf5;border:0" });
  const note = h("p", { class: "w-note", "aria-live": "polite" }, "Click any highlighted part of the error to learn what it tells you.");
  el.append(h("div", { class: "w-row" }, h("span", { class: "w-label" }, "Broken program"), pick), code,
    h("div", { class: "w-label", style: "margin-top:.6rem" }, "What Python says"), tb, note);

  const part = (text, explain, colour) => h("button", {
    type: "button", style: `all:unset;cursor:pointer;border-bottom:2px dotted ${colour};color:inherit`,
    onclick: () => { note.textContent = explain; },
  }, text);

  async function show() {
    const src = SRC[pick.value];
    code.textContent = src;
    tb.textContent = "Running…";
    const r = await py.run(src);
    const e = r.error;
    if (!e) { tb.textContent = r.output; return; }
    const lines = e.traceback.split("\n");
    const out = [];
    const fileCount = lines.filter((l) => /^\s*File ".*?", line \d+/.test(l)).length;
    let fileNo = 0;
    for (const line of lines) {
      let m;
      if (line.startsWith("Traceback")) out.push(part(line, "This first line just announces an error report. The most useful lines are at the bottom.", "#93a0b8"));
      else if ((m = line.match(/^(\s*File ".*?", )(line (\d+))(.*)$/))) {
        fileNo++;
        const last = fileNo === fileCount;
        const text = last
          ? `Where it happened: line ${m[3]}${m[4].includes(" in ") && !m[4].includes("<module>") ? `, inside the function ${m[4].split(" in ").pop()}` : ""}. Start your search there, and if nothing looks wrong, check the line just before.`
          : `Line ${m[3]} made a call, and the error happened further in. Each "File" line is one step in the chain of calls, from your main program at the top to where it went wrong at the bottom.`;
        out.push(h("span", {}, m[1], part(m[2], text, last ? "var(--yellow)" : "#93a0b8"), m[4]));
      }
      else if (/^\s*\^+\s*$/.test(line)) out.push(part(line, "The caret points at the exact spot where Python got confused.", "var(--yellow)"));
      else if (line.startsWith(e.type)) out.push(h("span", {}, part(e.type, `The error type. ${e.type} is a family of mistakes. Learn the families and you'll recognise most errors at a glance.`, "#f08b7b"),
        part(line.slice(e.type.length), "The message: Python's description of this particular problem. Read it slowly; it usually says exactly what's wrong. In plain words: " + (e.friendly || ""), "#f08b7b")));
      else if (line.trim()) out.push(part(line, "Your line of code, copied into the report so you don't have to go looking for it.", "#93a0b8"));
      else out.push(line);
      out.push("\n");
    }
    tb.replaceChildren(...out);
  }
  pick.onchange = show;
  show();
}
