// age = int(input("Age? ")) in slow motion: prompt, wait, text comes back, conversion, name.
import { h } from "../site.js?v=0064081c78";
import { py } from "../runtime.js?v=0064081c78";

export default function inputflow(el) {
  const field = h("input", { class: "w-input", value: "17", style: "width:8em", "aria-label": "What the user types" });
  const stages = h("ol", { style: "list-style:none;padding:0;margin:.8rem 0 0;display:grid;gap:.45rem" });
  const play = h("button", { type: "button", class: "btn btn-step" }, "Next step");
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Start again");
  el.append(h("div", { style: "font:600 1.2rem var(--f-code)" }, 'age = int(input("Age? "))'),
    h("div", { class: "w-row", style: "margin-top:.5rem" }, h("span", { class: "w-label" }, "The user will type"), field, play, reset),
    stages);
  let i = 0, steps = [];
  async function build() {
    const typed = field.value;
    const conv = await py.eval(`repr(int(${JSON.stringify(typed)}))`, true);
    steps = [
      ["Python works from the inside out. First, input(\"Age? \") runs: it prints the prompt.", `Age? ▌`],
      ["The program pauses. Nothing else happens until the user types and presses Enter.", `Age? ${typed}↵`],
      ["input() gives back what was typed, always as a string, without the Enter.", `input(...)  →  ${JSON.stringify(typed).replace(/^"|"$/g, "'")}   (type: str)`],
      conv.error
        ? ["int() can't read that as a whole number, so the program crashes here.", `int('${typed}')  →  ${conv.error}`]
        : ["int() turns the text into a number.", `int('${typed}')  →  ${conv.value}   (type: int)`],
      conv.error
        ? ["The name age is never created. Later lessons show how to ask again instead of crashing.", "age  →  never assigned"]
        : ["Finally the label age is stuck on that int.", `age  →  ${conv.value}`],
    ];
  }
  function draw() {
    stages.replaceChildren(...steps.slice(0, i).map(([t, v], k) => h("li", {
      style: `border-left:3px solid ${k === i - 1 ? "var(--yellow)" : "var(--line)"};padding:.3rem .7rem;background:${k === i - 1 ? "var(--yellow-soft)" : "transparent"}`,
    }, h("div", {}, t), h("code", { style: `display:inline-block;margin-top:.2rem;${v.includes("Error") ? "color:var(--red)" : ""}` }, v))));
    play.disabled = i >= steps.length;
  }
  play.onclick = async () => { if (i === 0) await build(); i++; draw(); };
  reset.onclick = () => { i = 0; draw(); };
  field.oninput = () => { i = 0; draw(); };
  draw();
}
