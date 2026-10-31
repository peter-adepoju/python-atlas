import "./common.js?v=0064081c78";
import { $, h, toast } from "../site.js?v=0064081c78";
import { progress } from "../progress.js?v=0064081c78";
import { PyConsole } from "../console.js?v=0064081c78";
import { ensure } from "../runtime.js?v=0064081c78";

const TEMPLATES = {
  "Hello": 'print("Hello!")\n',
  "Ask and answer": 'name = input("What is your name? ")\nage = int(input("How old are you? "))\nprint(f"{name}, in ten years you will be {age + 10}.")\n',
  "Times table": 'n = 7\nfor i in range(1, 13):\n    print(f"{i:>2} x {n} = {i * n:>3}")\n',
  "Guess the number": 'import random\nsecret = random.randint(1, 20)\nguess = 0\nwhile guess != secret:\n    guess = int(input("Guess 1-20: "))\n    if guess < secret:\n        print("Higher")\n    elif guess > secret:\n        print("Lower")\nprint("Got it!")\n',
};

const files = () => progress.all("play:").map(([k, v]) => ({ key: k, ...v })).filter((f) => !f.deleted).sort((a, b) => (b.at || 0) - (a.at || 0));
let current = null;

function start() {
  const el = $("#play-console");
  const pc = new PyConsole(el);
  ensure().catch(() => {});
  const nameIn = $("#file-name");
  let t;
  pc.ed.cm.on("change", () => {
    clearTimeout(t);
    $("#saved-note").textContent = "Saving…";
    t = setTimeout(() => {
      if (!current) return;
      progress.set(current, { name: nameIn.value || "untitled", code: pc.ed.value, at: Date.now() });
      $("#saved-note").textContent = "Saved";
      list();
    }, 700);
  });
  nameIn.addEventListener("change", () => {
    if (!current) return;
    progress.set(current, { name: nameIn.value || "untitled", code: pc.ed.value, at: Date.now() });
    list();
  });

  function open(key) {
    const f = progress.get(key);
    current = key;
    nameIn.value = f.name;
    pc.original = f.code;
    pc.ed.value = f.code;
    pc.clearPanels();
    progress.set("play-last", { key });
    list();
  }
  function create(name, code) {
    const key = "play:" + Date.now().toString(36);
    progress.set(key, { name, code, at: Date.now() });
    open(key);
  }
  function list() {
    $("#files").replaceChildren(...files().map((f) => h("li", {},
      h("button", { type: "button", class: "file-btn" + (f.key === current ? " is-on" : ""), onclick: () => open(f.key) }, f.name))));
  }
  $("#templates").replaceChildren(...Object.entries(TEMPLATES).map(([n, c]) => h("li", {},
    h("button", { type: "button", class: "file-btn", onclick: () => create(n, c) }, n))));
  $("#new-file").onclick = () => create(`script ${files().length + 1}`, "# Your code here\n");
  $("#delete-file").onclick = () => {
    if (!current || !confirm(`Delete "${nameIn.value}"?`)) return;
    progress.set(current, { deleted: true, at: Date.now() });
    toast("Deleted");
    const rest = files();
    rest.length ? open(rest[0].key) : create("scratch", "# Your code here\n");
  };
  const last = progress.get("play-last");
  if (last && progress.get(last.key) && !progress.get(last.key).deleted) open(last.key);
  else if (files().length) open(files()[0].key);
  else create("scratch", TEMPLATES.Hello);
}
if (window.CodeMirror) start(); else addEventListener("load", start);
