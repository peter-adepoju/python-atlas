// File reading figure: a real file drawn character by character, with the position marker
// that every read moves along. Add operations and watch what each one returns.
import { h } from "../site.js?v=588dc67651";
import { py } from "../runtime.js?v=588dc67651";

const OPS = ["f.readline()", "f.read(3)", "f.read()", "f.readlines()", "for line in f: ...", "f.close()"];

export default function fileread(el, { text = "Ada,93\nBo,41\nCy,78\n", name = "marks.txt" } = {}) {
  const area = h("textarea", { class: "w-input", spellcheck: "false", rows: Math.max(3, text.split("\n").length), style: "width:100%;font-family:var(--f-code);line-height:1.5;resize:vertical", "aria-label": "File contents" });
  area.value = text;
  let ops = [];
  const strip = h("div", { style: "display:flex;flex-wrap:wrap;gap:2px;margin-top:.7rem;font:600 .9rem var(--f-code)" });
  const log = h("ol", { style: "margin:.6rem 0 0;padding-left:1.4rem;font:500 .9rem/1.7 var(--f-code)" });
  const note = h("p", { class: "w-note" });
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Open again");
  el.append(h("div", { class: "w-label" }, `${name} holds:`), area,
    h("div", { class: "w-row", style: "margin-top:.5rem;align-items:center" }, h("code", {}, `f = open("${name}")`), reset),
    h("div", { class: "w-row", style: "margin-top:.4rem" }, OPS.map((o) => h("button", { type: "button", class: "w-chip", style: "cursor:pointer", onclick: () => { ops.push(o === "for line in f: ..." ? "for line in f" : o); go(); } }, o))),
    strip, log, note);
  reset.onclick = () => { ops = []; go(); };

  function drawStrip(t, pos, closed) {
    const cells = [];
    [...t].forEach((ch, i) => {
      if (i === pos && !closed) cells.push(marker());
      const nl = ch === "\n";
      cells.push(h("span", { style: `min-width:1.25em;text-align:center;padding:.2rem .1rem;border-radius:3px;border:1px solid ${i < pos ? "var(--line)" : "var(--blue)"};background:${i < pos ? "var(--sunk)" : "var(--blue-soft)"};color:${i < pos ? "var(--ink-3)" : nl ? "var(--violet)" : "var(--ink)"}` }, nl ? "\\n" : ch === " " ? " " : ch));
      if (nl) cells.push(h("span", { style: "flex-basis:100%;height:0" }));
    });
    if (pos >= t.length && !closed) cells.push(marker());
    strip.replaceChildren(...cells);
  }
  function marker() { return h("span", { title: "the file's position", style: "width:3px;margin:0 1px;background:var(--red);border-radius:2px;align-self:stretch" }); }

  let timer;
  async function go() {
    const t = area.value;
    const r = await py.call("file_steps", t, JSON.stringify(ops));
    const last = r.steps[r.steps.length - 1];
    drawStrip(t, last ? last.pos : 0, last ? last.closed : false);
    log.replaceChildren(...r.steps.map((s) => h("li", {}, h("span", { style: "color:var(--blue)" }, s.op === "for line in f" ? "for line in f: ..." : s.op), "  ",
      s.error ? h("span", { class: "w-err" }, s.error) : s.op === "f.close()" ? h("span", { class: "muted" }, "closed") : h("span", {}, "-> ", s.shown))));
    if (!ops.length) note.textContent = "The red bar is the file's position: where the next read starts. Grey characters have been read. Pick an operation.";
    else if (last.error) note.textContent = "A closed file can't be read. Press Open again to start over.";
    else if (last.pos >= t.length && !last.closed) note.textContent = "The position is at the end. Every read from here gives an empty result: '' or []. To read again, open the file again.";
    else note.textContent = "Each read carries on from where the last one stopped.";
  }
  area.addEventListener("input", () => { clearTimeout(timer); ops = []; timer = setTimeout(go, 400); });
  go();
}
