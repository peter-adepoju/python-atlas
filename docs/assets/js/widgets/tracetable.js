// Trace table: the table you'd draw by hand, built one row at a time.
// Each row is one line Python ran, with every variable's value after it,
// the condition's value for while and if lines, and anything printed.
import { h } from "../site.js?v=8fe38f9496";
import { py } from "../runtime.js?v=8fe38f9496";

export default function tracetable(el, { code = "n = 1\ntotal = 0\nwhile n <= 3:\n    total += n\n    n += 1\nprint(total)", inputs = [], editable = true } = {}) {
  const area = h("textarea", { class: "w-input", spellcheck: "false", rows: Math.max(4, code.split("\n").length), style: "width:100%;font-family:var(--f-code);line-height:1.6;resize:vertical", "aria-label": "Program to trace" });
  area.value = code;
  if (!editable) area.readOnly = true;
  const listing = h("pre", { class: "w-out", style: "margin:0;line-height:1.6;overflow-x:auto" });
  const tableBox = h("div", { style: "overflow:auto;max-height:420px;border:1px solid var(--line);border-radius:var(--radius-s)" });
  const next = h("button", { type: "button", class: "btn btn-step" }, "Next row");
  const all = h("button", { type: "button", class: "btn btn-quiet" }, "Show all");
  const again = h("button", { type: "button", class: "btn btn-quiet" }, editable ? "Trace again" : "Start again");
  const note = h("p", { class: "w-note" });
  el.append(
    editable ? h("details", { style: "margin-bottom:.6rem" }, h("summary", { class: "w-label", style: "cursor:pointer" }, "Edit the program"), area) : null,
    h("div", { style: "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:1rem;align-items:start" }, listing, tableBox),
    h("div", { class: "w-row", style: "margin-top:.7rem" }, next, all, again), note);

  let data = null, shown = 0;

  function drawListing(cur) {
    const src = area.value.split("\n");
    listing.replaceChildren(...src.map((t, i) => h("div", {
      style: `padding:0 .4rem;border-radius:3px;white-space:pre;${i + 1 === cur ? "background:var(--yellow-soft);box-shadow:inset 3px 0 var(--yellow)" : ""}`,
    }, h("span", { style: "color:var(--ink-3);display:inline-block;width:1.8em" }, String(i + 1)), t || " ")));
  }

  function draw() {
    const rows = data.rows.slice(0, shown);
    const isB = (v) => v === true || v === false;
    const hasCond = data.rows.some((r) => isB(r.cond));
    const hasOut = data.rows.some((r) => r.out);
    const head = h("tr", {}, h("th", {}, "#"), h("th", {}, "line"), hasCond ? h("th", {}, "condition") : null,
      data.names.map((n) => h("th", { style: "font-family:var(--f-code)" }, n)), hasOut ? h("th", {}, "prints") : null);
    const body = rows.map((r, i) => {
      const prev = i ? rows[i - 1].vars : {};
      const last = i === rows.length - 1;
      return h("tr", { style: last ? "background:var(--yellow-soft)" : "" },
        h("td", { style: "color:var(--ink-3)" }, String(i + 1)),
        h("td", { style: "font-family:var(--f-code)" }, String(r.line)),
        hasCond ? h("td", { style: `font:600 .9rem var(--f-code);color:${r.cond === true ? "var(--green)" : r.cond === false ? "var(--red)" : "var(--ink-3)"}` }, isB(r.cond) ? (r.cond ? "True" : "False") : "") : null,
        data.names.map((n) => {
          const v = r.vars[n];
          const changed = v !== undefined && v !== prev[n];
          return h("td", { style: `font-family:var(--f-code);${changed ? "font-weight:700" : "color:var(--ink-3)"}` }, v === undefined ? "" : v);
        }),
        hasOut ? h("td", { style: "font-family:var(--f-code);white-space:pre" }, (r.out || "").replace(/\n$/, "").replace(/\n/g, " ↵ ")) : null);
    });
    tableBox.replaceChildren(h("table", { style: "margin:0;min-width:100%" }, h("thead", {}, head), h("tbody", {}, body)));
    tableBox.scrollTop = tableBox.scrollHeight;
    drawListing(rows.length ? rows[rows.length - 1].line : 0);
    const loops = data.rows.slice(0, shown).filter((r) => r.cond === true && /^\s*while\b/.test(r.src)).length;
    next.disabled = shown >= data.rows.length;
    all.disabled = next.disabled;
    if (data.error && shown >= data.rows.length) note.textContent = data.error;
    else if (shown >= data.rows.length) note.textContent = `Finished after ${data.rows.length} lines.${loops ? ` The loop body ran ${loops} time${loops === 1 ? "" : "s"}.` : ""}${data.truncated ? " (Stopped early: the program ran too many lines to show.)" : ""}`;
    else note.textContent = shown ? "Bold values changed on this row. Before you press Next row, say what the next row will be." : "Press Next row to run the first line. Predict each row before you reveal it.";
  }

  async function load() {
    note.textContent = "Tracing...";
    data = await py.call("trace_table", area.value, inputs);
    shown = 0;
    draw();
  }
  next.onclick = () => { shown += 1; draw(); };
  all.onclick = () => { shown = data.rows.length; draw(); };
  again.onclick = load;
  load();
}
