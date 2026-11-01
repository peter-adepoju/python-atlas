// The X-ray: steps through a program and draws names, frames and objects.
import { h, svg, reducedMotion } from "./site.js?v=588dc67651";
import { settings } from "./settings.js?v=588dc67651";

export class XRay {
  constructor(parent, editor, { onClose } = {}) {
    this.editor = editor;
    this.i = 0;
    this.steps = [];
    this.everyObject = settings().xrayEvery;
    this.playing = null;
    this.root = h("div", { class: "xray", role: "region", "aria-label": "Step-by-step view of your program" });
    this.counter = h("span", { class: "xr-count" });
    this.slider = h("input", { type: "range", min: 0, max: 0, value: 0, "aria-label": "Step", oninput: () => this.go(+this.slider.value) });
    this.playBtn = h("button", { class: "btn btn-quiet", type: "button", onclick: () => this.togglePlay() }, "Play");
    const objToggle = h("input", { type: "checkbox", checked: this.everyObject, onchange: (e) => { this.everyObject = e.target.checked; this.draw(); } });
    this.caption = h("p", { class: "xr-caption" });
    this.board = h("div", { class: "xr-board" });
    this.out = h("pre", { class: "xr-out" });
    this.root.append(
      h("div", { class: "xr-bar" },
        h("button", { class: "btn btn-quiet", type: "button", onclick: () => this.go(0), "aria-label": "First step" }, "⏮"),
        h("button", { class: "btn btn-quiet", type: "button", onclick: () => this.go(this.i - 1) }, "Back"),
        h("button", { class: "btn btn-step", type: "button", onclick: () => this.go(this.i + 1) }, "Next step"),
        this.playBtn,
        this.slider, this.counter,
        h("label", { class: "xr-opt" }, objToggle, " show every object"),
        h("button", { class: "btn btn-quiet xr-close", type: "button", onclick: () => { this.stop(); this.root.remove(); this.editor.mark({}); onClose && onClose(); } }, "Close")),
      this.caption,
      h("div", { class: "xr-legend" },
        h("span", { class: "lg lg-next" }, "line about to run"),
        h("span", { class: "lg lg-prev" }, "line that just ran"),
        h("span", { class: "lg lg-new" }, "just changed")),
      this.board,
      h("div", { class: "xr-outwrap" }, h("span", { class: "xr-outlabel" }, "Printed so far"), this.out),
    );
    parent.append(this.root);
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { this.go(this.i + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { this.go(this.i - 1); e.preventDefault(); }
    });
    this.ro = new ResizeObserver(() => this.arrows());
    this.ro.observe(this.board);
  }

  load(result) {
    this.steps = result.steps || [];
    this.result = result;
    this.slider.max = Math.max(this.steps.length - 1, 0);
    this.go(0);
  }

  togglePlay() {
    if (this.playing) return this.stop();
    if (this.i >= this.steps.length - 1) this.go(0);
    this.playBtn.textContent = "Pause";
    this.playing = setInterval(() => {
      if (this.i >= this.steps.length - 1) return this.stop();
      this.go(this.i + 1);
    }, reducedMotion() ? Math.max(1400, settings().xraySpeed) : settings().xraySpeed);
  }
  stop() { clearInterval(this.playing); this.playing = null; this.playBtn.textContent = "Play"; }

  go(i) {
    if (!this.steps.length) return;
    this.i = Math.max(0, Math.min(i, this.steps.length - 1));
    this.slider.value = this.i;
    this.counter.textContent = `Step ${this.i + 1} of ${this.steps.length}`;
    this.draw();
  }

  describe(step, prev) {
    const r = this.result;
    if (step.event === "end") {
      if (r.error) return `The program stopped with an error.`;
      return "The program has finished. This is everything it left behind in memory.";
    }
    if (step.event === "call") return `Calling ${step.stack[step.stack.length - 1].name}(): Python makes a new frame for its local names.`;
    if (step.event === "return") return `${step.stack[step.stack.length - 1].name}() is returning a value; its frame is about to disappear.`;
    const isLast = this.i === this.steps.length - 1;
    let s = `Line ${step.line} is about to run.`;
    if (prev && prev.line) s = `Line ${prev.line} just ran. ` + s;
    if (isLast && r.truncated) s += " (The X-ray stops after 600 steps, which is enough to see the pattern.)";
    if (isLast && r.error) s += ` Running it causes ${r.error.type}: ${r.error.message}`;
    if (isLast && r.need_input) s += ` The program is waiting for input: type it into the console box and run the X-ray again.`;
    return s;
  }

  draw() {
    const step = this.steps[this.i];
    const prev = this.i > 0 ? this.steps[this.i - 1] : null;
    if (!step) return;
    const isLast = this.i === this.steps.length - 1;
    this.editor.mark({ next: step.event === "end" ? null : step.line, prev: prev && prev.line, error: isLast && this.result.error ? this.result.error.line : null });
    this.caption.textContent = this.describe(step, prev);
    this.out.textContent = step.stdout || "";

    const heap = new Map(step.heap.map((o) => [o.id, o]));
    const prevHeap = prev ? new Map(prev.heap.map((o) => [o.id, o])) : new Map();
    const prevVars = new Map();
    if (prev) prev.stack.forEach((f, fi) => f.vars.forEach(([k, id]) => prevVars.set(fi + ":" + k, id)));

    const inline = (o) => !this.everyObject && o && o.kind === "value";
    const changed = (o) => {
      const p = prevHeap.get(o.id);
      return !p || JSON.stringify(p) !== JSON.stringify(o);
    };

    // Which objects are drawn on the right? Those reachable from variables, minus inlined ones.
    const shown = [];
    const seen = new Set();
    const visit = (id, fromContainer) => {
      const o = heap.get(id);
      if (!o || seen.has(id)) return;
      if (fromContainer && inline(o)) return;
      seen.add(id); shown.push(o);
      (o.items || []).forEach((x) => visit(x, true));
      (o.pairs || []).forEach(([k, v]) => { if (typeof k === "number") visit(k, true); visit(v, true); });
    };
    step.stack.forEach((f) => f.vars.forEach(([, id]) => visit(id, false)));

    const frames = h("div", { class: "xr-frames" }, h("div", { class: "xr-colhead" }, "Names (frames)"));
    step.stack.forEach((f, fi) => {
      const top = fi === step.stack.length - 1 && step.stack.length > 1;
      const box = h("div", { class: "xr-frame" + (top ? " is-top" : "") }, h("div", { class: "xr-fname" }, f.name));
      if (!f.vars.length) box.append(h("div", { class: "xr-empty" }, "no names yet"));
      f.vars.forEach(([k, id]) => {
        const isNew = !prevVars.has(fi + ":" + k) || prevVars.get(fi + ":" + k) !== id;
        box.append(h("div", { class: "xr-var" + (isNew && prev ? " is-new" : "") },
          h("span", { class: "xr-name" }, k),
          h("span", { class: "xr-port", "data-to": id })));
      });
      if (step.event === "return" && top && step.ret !== undefined) {
        box.append(h("div", { class: "xr-var is-ret" }, h("span", { class: "xr-name" }, "return value"), h("span", { class: "xr-port", "data-to": step.ret })));
        visit(step.ret, false);
      }
      frames.append(box);
    });

    const objs = h("div", { class: "xr-objs" }, h("div", { class: "xr-colhead" }, "Objects"));
    const cellFor = (id) => {
      const o = heap.get(id);
      if (!o) return h("span", { class: "xr-cellval" }, "…");
      if (inline(o)) return h("span", { class: "xr-cellval" }, o.repr);
      return h("span", { class: "xr-port", "data-to": id });
    };
    for (const o of shown) {
      const box = h("div", { class: `xr-obj k-${o.kind}` + (prev && changed(o) ? " is-new" : ""), "data-id": o.id },
        h("span", { class: "xr-type" }, o.type));
      if (o.kind === "value" || o.kind === "func" || o.kind === "class") box.append(h("span", { class: "xr-repr" }, o.repr));
      if (o.kind === "seq") {
        const row = h("div", { class: "xr-cells" });
        if (!o.items.length) row.append(h("span", { class: "xr-empty" }, "empty"));
        o.items.forEach((id, n) => row.append(h("div", { class: "xr-cell" }, h("span", { class: "xr-idx" }, o.type === "set" || o.type === "frozenset" ? "" : n), cellFor(id))));
        if (o.more) row.append(h("span", { class: "xr-empty" }, `+${o.more} more`));
        box.append(row);
      }
      if (o.kind === "dict" || o.kind === "object") {
        const tbl = h("div", { class: "xr-pairs" });
        if (!o.pairs.length) tbl.append(h("span", { class: "xr-empty" }, "empty"));
        o.pairs.forEach(([k, v]) => tbl.append(h("div", { class: "xr-pair" },
          h("span", { class: "xr-key" }, typeof k === "number" ? cellFor(k) : k), cellFor(v))));
        box.append(tbl);
      }
      objs.append(box);
    }

    this.board.replaceChildren(frames, objs);
    this.svg = svg("svg", { class: "xr-arrows", "aria-hidden": "true" },
      svg("defs", {}, svg("marker", { id: "xr-head", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
        svg("path", { d: "M0,0 L10,5 L0,10 z", class: "xr-head" }))));
    this.board.append(this.svg);
    requestAnimationFrame(() => this.arrows());
  }

  arrows() {
    if (!this.svg) return;
    const base = this.board.getBoundingClientRect();
    this.svg.setAttribute("width", base.width);
    this.svg.setAttribute("height", base.height);
    [...this.svg.querySelectorAll("path.xr-line")].forEach((p) => p.remove());
    this.board.querySelectorAll(".xr-port").forEach((port) => {
      const target = this.board.querySelector(`.xr-obj[data-id="${port.dataset.to}"]`);
      if (!target) return;
      const a = port.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - base.left, y1 = a.top + a.height / 2 - base.top;
      const x2 = b.left - base.left - 2, y2 = b.top + Math.min(16, b.height / 2) - base.top;
      const dx = Math.max(30, (x2 - x1) / 2);
      const fromObj = port.closest(".xr-obj");
      const d = fromObj && x2 <= x1 + 10
        ? `M${x1},${y1} C${x1 + 60},${y1} ${x2 - 40},${y2} ${x2},${y2}`
        : `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
      this.svg.append(svg("path", { d, class: "xr-line" + (port.closest(".is-new") ? " is-new" : ""), "marker-end": "url(#xr-head)" }));
    });
  }
}
