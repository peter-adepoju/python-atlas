// A toy computer: memory, a processor and the fetch–decode–execute cycle.
import { h, svg, reducedMotion } from "../site.js?v=7343aa5d1b";

const PROGRAMS = {
  add: {
    label: "Add two numbers (like total = 2 + 3)",
    mem: [["LOAD", 6], ["ADD", 7], ["STORE", 8], ["PRINT", 8], ["HALT", null], null, 2, 3, 0, null],
    python: "total = a + b\nprint(total)",
  },
  count: {
    label: "Count down from 3 (a loop)",
    mem: [["LOAD", 8], ["PRINT", 8], ["SUB", 9], ["STORE", 8], ["JUMPNZ", 1], ["HALT", null], null, null, 3, 1],
    python: "n = 3\nwhile n != 0:\n    print(n)\n    n = n - 1",
  },
};

const EXPLAIN = {
  LOAD: (a) => `LOAD ${a}: copy the number in memory cell ${a} into the accumulator (the processor's scratch space).`,
  ADD: (a) => `ADD ${a}: add the number in cell ${a} to the accumulator.`,
  SUB: (a) => `SUB ${a}: subtract the number in cell ${a} from the accumulator.`,
  STORE: (a) => `STORE ${a}: copy the accumulator back into memory cell ${a}.`,
  PRINT: (a) => `PRINT ${a}: send the number in cell ${a} to the screen.`,
  JUMPNZ: (a) => `JUMPNZ ${a}: if the accumulator is not zero, jump back to cell ${a}; otherwise carry on.`,
  HALT: () => "HALT: stop. The program is finished.",
};

export default function machine(el, { program = "add" } = {}) {
  let key = program;
  let mem, pc, acc, ir, phase, out, halted, steps;
  const W = 640, H = 300;
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "w-svg", role: "img", "aria-label": "Memory cells and a processor" });
  const note = h("p", { class: "w-note", "aria-live": "polite" });
  const screen = h("div", { class: "w-out", "aria-label": "Screen" });
  const stepBtn = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const runBtn = h("button", { type: "button", class: "btn btn-quiet" }, "Run to the end");
  const resetBtn = h("button", { type: "button", class: "btn btn-quiet" }, "Reset");
  const pick = h("select", { class: "w-input", "aria-label": "Program" }, Object.entries(PROGRAMS).map(([k, p]) => h("option", { value: k, selected: k === key }, p.label)));
  const py = h("pre", { class: "w-out" });
  el.append(h("div", { class: "w-row" }, pick), s,
    h("div", { class: "w-row" }, stepBtn, runBtn, resetBtn, h("span", { class: "w-label", id: "" }, "")), note,
    h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-top:.6rem" },
      h("div", {}, h("div", { class: "w-label" }, "Screen"), screen),
      h("div", {}, h("div", { class: "w-label" }, "The same idea in Python"), py)));

  function reset() {
    const p = PROGRAMS[key];
    mem = p.mem.map((x) => (Array.isArray(x) ? [...x] : x));
    pc = 0; acc = 0; ir = null; phase = "fetch"; out = []; halted = false; steps = 0;
    py.textContent = p.python;
    stepBtn.disabled = false;
    note.textContent = "Press Next step. The yellow arrow is the program counter: it points at the next instruction.";
    draw();
  }

  function fmt(c) { return c === null ? "" : Array.isArray(c) ? (c[1] === null ? c[0] : `${c[0]} ${c[1]}`) : String(c); }

  function draw(active = {}) {
    s.replaceChildren();
    s.append(svg("text", { x: 20, y: 24, class: "dim", "font-size": 13, text: "Memory (RAM): numbered cells. Some hold instructions, some hold data." }));
    for (let i = 0; i < 10; i++) {
      const x = 20 + i * 60, y = 40;
      const isPc = i === pc && !halted;
      s.append(svg("rect", { x, y, width: 56, height: 46, rx: 5, fill: active.cell === i ? "var(--yellow-soft)" : "var(--paper)", stroke: isPc ? "var(--yellow)" : "var(--line)", "stroke-width": isPc ? 3 : 1 }));
      s.append(svg("text", { x: x + 28, y: y + 18, "text-anchor": "middle", class: "dim", "font-size": 11, text: `cell ${i}` }));
      s.append(svg("text", { x: x + 28, y: y + 36, "text-anchor": "middle", class: "mono", "font-size": 12, text: fmt(mem[i]) }));
      if (isPc) s.append(svg("path", { d: `M${x + 28},${y + 50} l-7,12 h14 z`, fill: "var(--yellow)" }));
    }
    // CPU
    const cx = 150, cy = 140;
    s.append(svg("rect", { x: cx, y: cy, width: 340, height: 130, rx: 10, fill: "var(--sunk)", stroke: "var(--ink-3)" }));
    s.append(svg("text", { x: cx + 14, y: cy + 22, "font-size": 14, "font-weight": 700, text: "Processor (CPU)" }));
    const reg = (label, val, x, hl) => {
      s.append(svg("rect", { x, y: cy + 40, width: 96, height: 60, rx: 6, fill: hl ? "var(--yellow-soft)" : "var(--surface)", stroke: hl ? "var(--yellow)" : "var(--line)", "stroke-width": hl ? 2.5 : 1 }));
      s.append(svg("text", { x: x + 48, y: cy + 58, "text-anchor": "middle", class: "dim", "font-size": 11, text: label }));
      s.append(svg("text", { x: x + 48, y: cy + 84, "text-anchor": "middle", class: "mono", "font-size": 15, "font-weight": 600, text: val }));
    };
    reg("program counter", String(pc), cx + 14, active.pc);
    reg("instruction", ir ? fmt(ir) : "-", cx + 122, active.ir);
    reg("accumulator", String(acc), cx + 230, active.acc);
    s.append(svg("text", { x: cx + 14, y: cy + 120, class: "dim", "font-size": 12, text: halted ? "Halted." : `Next phase: ${phase}` }));
    if (active.cell !== undefined) {
      const x = 20 + active.cell * 60 + 28;
      s.append(svg("path", { d: `M${x},90 C${x},120 ${cx + 170},110 ${cx + 170},${cy}`, fill: "none", stroke: "var(--yellow)", "stroke-width": 2.5, "stroke-dasharray": reducedMotion() ? "" : "6 4" }));
    }
    screen.textContent = out.join("\n") || " ";
  }

  function step() {
    if (halted) return;
    steps++;
    if (steps > 60) { halted = true; note.textContent = "Stopped after 60 steps."; draw(); return; }
    if (phase === "fetch") {
      ir = mem[pc];
      note.textContent = `Fetch: the processor reads cell ${pc} and copies "${fmt(ir)}" into its instruction register.`;
      phase = "decode";
      draw({ cell: pc, ir: true });
      return;
    }
    if (phase === "decode") {
      const [op, a] = ir;
      note.textContent = "Decode: " + EXPLAIN[op](a);
      phase = "execute";
      draw({ ir: true });
      return;
    }
    const [op, a] = ir;
    let active = {};
    pc += 1;
    if (op === "LOAD") { acc = mem[a]; active = { cell: a, acc: true }; }
    if (op === "ADD") { acc += mem[a]; active = { cell: a, acc: true }; }
    if (op === "SUB") { acc -= mem[a]; active = { cell: a, acc: true }; }
    if (op === "STORE") { mem[a] = acc; active = { cell: a }; }
    if (op === "PRINT") { out.push(String(mem[a])); active = { cell: a }; }
    if (op === "JUMPNZ" && acc !== 0) { pc = a; active = { pc: true }; }
    if (op === "HALT") { halted = true; pc -= 1; stepBtn.disabled = true; }
    note.textContent = halted ? "Execute: HALT. The program has finished." : `Execute: done. The program counter now points at cell ${pc}.`;
    phase = "fetch";
    draw({ ...active, pc: true });
  }

  stepBtn.onclick = step;
  resetBtn.onclick = reset;
  pick.onchange = () => { key = pick.value; reset(); };
  runBtn.onclick = () => {
    const tick = () => { if (!halted) { step(); setTimeout(tick, reducedMotion() ? 50 : 260); } };
    tick();
  };
  reset();
}
