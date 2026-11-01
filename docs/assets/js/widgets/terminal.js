// A practice terminal: a pretend shell with its own small set of folders and files, so commands
// can be tried safely. Nothing here touches the real computer.
import { h } from "../site.js?v=8fe38f9496";
import { makeGit } from "./minigit.js?v=8fe38f9496";

const START = {
  "notes.txt": "Buy eggs\nCall Ada\n",
  "projects": { "hello.py": 'print("Hello!")\n', "data": { "marks.csv": "name,mark\nAda,71\nBen,64\n" } },
  "photos": { "lagos.jpg": "(a photo)", "beach.jpg": "(a photo)" },
};

function clone(x) { return JSON.parse(JSON.stringify(x)); }

export default function terminal(el, { files = START, home = "/home/you", tasks = [] } = {}) {
  let root, cwd, history = [], hpos = 0, doneTasks = new Set(), git = null;
  const screen = h("div", { class: "w-out", style: "height:15rem;overflow:auto;white-space:pre-wrap;font-size:.86rem;line-height:1.45", "aria-live": "polite" });
  const prompt = h("span", { style: "font:600 .86rem var(--f-code);white-space:nowrap" });
  const input = h("input", { class: "w-input", style: "flex:1;min-width:6rem", spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": "Type a command" });
  const reset = h("button", { type: "button", class: "btn btn-quiet" }, "Start again");
  const taskBox = h("div", { style: "margin-top:.6rem" });
  el.append(screen, h("div", { class: "w-row", style: "margin-top:.4rem;align-items:center;gap:.4rem" }, prompt, input, reset), taskBox);

  const show = () => (cwd === home ? "~" : cwd.startsWith(home + "/") ? "~" + cwd.slice(home.length) : cwd);
  function print(text, cls) { screen.append(h("div", { style: cls === "err" ? "color:var(--red)" : cls === "cmd" ? "color:var(--blue-ink);font-weight:600" : "" }, text)); screen.scrollTop = screen.scrollHeight; }
  function resolve(p) {
    if (!p) return cwd;
    let parts = p.startsWith("/") ? [] : p.startsWith("~") ? home.split("/").filter(Boolean) : cwd.split("/").filter(Boolean);
    for (const seg of p.replace(/^~/, "").split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") parts.pop(); else parts.push(seg);
    }
    return "/" + parts.join("/");
  }
  function node(path) {
    let cur = root;
    for (const seg of path.split("/").filter(Boolean)) { if (typeof cur !== "object" || !(seg in cur)) return undefined; cur = cur[seg]; }
    return cur;
  }
  const parentOf = (path) => { const i = path.lastIndexOf("/"); return [path.slice(0, i) || "/", path.slice(i + 1)]; };
  const fsApi = {
    node: (p) => node(p), resolve: (p) => resolve(p), cwd: () => cwd,
    setFile(path, text) { const [par, name] = parentOf(path); const parts = par.split("/").filter(Boolean); let d = root; for (const seg of parts) { if (typeof d[seg] !== "object") d[seg] = {}; d = d[seg]; } d[name] = text; },
    removeFile(path) { const [par, name] = parentOf(path); const d = node(par); if (d && typeof d === "object") delete d[name]; },
    listFiles(rootPath) { const out = {}; (function walk(d, pre) { for (const [k, v] of Object.entries(d)) { if (typeof v === "object") walk(v, pre + k + "/"); else out[pre + k] = v; } })(node(rootPath) || {}, ""); return out; },
  };
  function start() {
    root = {}; let cur = root;
    for (const seg of home.split("/").filter(Boolean)) { cur[seg] = {}; cur = cur[seg]; }
    Object.assign(cur, clone(files));
    cwd = home; screen.replaceChildren(); doneTasks = new Set(); git = makeGit(fsApi);
    print("A practice terminal. Nothing you do here touches your real computer. Type help to see the commands.");
    prompt.textContent = show() + " $"; drawTasks();
  }
  const glob = (pat, names) => { const re = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"); return names.filter((n) => re.test(n)); };
  function expand(args) {
    const out = [];
    for (const a of args) {
      if (/[*?]/.test(a)) {
        const cut = a.lastIndexOf("/");
        const dir = cut >= 0 ? a.slice(0, cut + 1) : "", pat = a.slice(cut + 1);
        const d = node(resolve(dir || "."));
        const m = typeof d === "object" ? glob(pat, Object.keys(d).sort()).map((n) => dir + n) : [];
        out.push(...(m.length ? m : [a]));
      } else out.push(a);
    }
    return out;
  }
  const C = {
    help: () => "Commands: pwd  ls [-l] [folder]  cd [folder]  mkdir name  touch name  cat file  echo text [> file | >> file]\n          cp from to  mv from to  rm file  rm -r folder  head -n N file  wc -l file  clear  history\n          git init | status | add | commit -m | log [--oneline] | diff [--staged] | restore | branch | switch [-c] | merge\nPaths: / (the top), ~ (home), . (here), .. (up one). Wildcards: *.txt",
    pwd: () => cwd,
    ls: (a) => {
      const long = a[0] === "-l"; if (long) a = a.slice(1);
      const p = resolve(a[0]); const d = node(p);
      if (d === undefined) throw `ls: cannot access '${a[0]}': No such file or directory`;
      if (typeof d === "string") return a[0];
      const names = Object.keys(d).sort();
      if (long) return names.map((n) => typeof d[n] === "object" ? `drwxr-xr-x  ${n}/` : `-rw-r--r--  ${String(d[n].length).padStart(5)}  ${n}`).join("\n") || "";
      return names.map((n) => typeof d[n] === "object" ? n + "/" : n).join("  ");
    },
    cd: (a) => {
      const p = resolve(a[0] || "~"); const d = node(p);
      if (d === undefined) throw `cd: ${a[0]}: No such file or directory`;
      if (typeof d !== "object") throw `cd: ${a[0]}: Not a directory`;
      cwd = p; return "";
    },
    mkdir: (a) => {
      if (!a.length) throw "mkdir: missing folder name";
      for (const x of a) { const [par, name] = parentOf(resolve(x)); const d = node(par); if (typeof d !== "object") throw `mkdir: cannot create '${x}': No such file or directory`; if (name in d) throw `mkdir: cannot create '${x}': File exists`; d[name] = {}; }
      return "";
    },
    touch: (a) => { for (const x of a) { const [par, name] = parentOf(resolve(x)); const d = node(par); if (typeof d !== "object") throw `touch: cannot touch '${x}': No such file or directory`; if (!(name in d)) d[name] = ""; } return ""; },
    cat: (a) => a.map((x) => { const d = node(resolve(x)); if (d === undefined) throw `cat: ${x}: No such file or directory`; if (typeof d === "object") throw `cat: ${x}: Is a directory`; return d.replace(/\n$/, ""); }).join("\n"),
    echo: (a) => a.join(" "),
    rm: (a) => {
      const rec = a[0] === "-r"; if (rec) a = a.slice(1);
      if (!a.length) throw "rm: missing operand";
      for (const x of a) { const [par, name] = parentOf(resolve(x)); const d = node(par); if (!d || !(name in d)) throw `rm: cannot remove '${x}': No such file or directory`; if (typeof d[name] === "object" && !rec) throw `rm: cannot remove '${x}': Is a directory (use rm -r, carefully)`; delete d[name]; }
      return "";
    },
    cp: (a) => { if (a.length < 2) throw "cp: missing file operand"; const src = node(resolve(a[0])); if (src === undefined) throw `cp: cannot stat '${a[0]}': No such file or directory`; let dest = resolve(a[1]); if (typeof node(dest) === "object") dest += "/" + parentOf(resolve(a[0]))[1]; const [par, name] = parentOf(dest); const d = node(par); if (typeof d !== "object") throw `cp: cannot create '${a[1]}'`; d[name] = clone(src); return ""; },
    mv: (a) => { C.cp(a); const [par, name] = parentOf(resolve(a[0])); delete node(par)[name]; return ""; },
    head: (a) => { let n = 10; if (a[0] === "-n") { n = +a[1]; a = a.slice(2); } return C.cat(a).split("\n").slice(0, n).join("\n"); },
    wc: (a) => { if (a[0] === "-l") a = a.slice(1); return a.map((x) => `${C.cat([x]).split("\n").filter((l, i, arr) => l || i < arr.length - 1).length} ${x}`).join("\n"); },
    clear: () => { screen.replaceChildren(); return ""; },
    git: (a) => git.run(a),
    nano: (a) => { throw "There's no editor here: use echo text > file, or echo text >> file to add a line"; },
    history: () => history.map((c, i) => `${String(i + 1).padStart(4)}  ${c}`).join("\n"),
  };
  function run(line) {
    print(show() + " $ " + line, "cmd");
    if (!line.trim()) return;
    history.push(line); hpos = history.length;
    let redirect = null;
    const m = line.match(/^(.*?)\s*(>>?)\s*(\S+)\s*$/);
    if (m) { line = m[1]; redirect = { mode: m[2], file: m[3] }; }
    const words = (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((w) => w.replace(/^["']|["']$/g, ""));
    const [cmd, ...rawArgs] = words;
    const args = expand(rawArgs);
    try {
      if (!C[cmd]) throw `${cmd}: command not found (type help to see the commands)`;
      const out = C[cmd](args);
      if (redirect) {
        const [par, name] = parentOf(resolve(redirect.file)); const d = node(par);
        if (typeof d !== "object") throw `${redirect.file}: No such file or directory`;
        d[name] = (redirect.mode === ">>" && typeof d[name] === "string" ? d[name] : "") + out + "\n";
      } else if (out) print(out);
    } catch (e) { print(String(e), "err"); }
    prompt.textContent = show() + " $"; drawTasks();
  }
  function drawTasks() {
    if (!tasks.length) return;
    taskBox.replaceChildren(h("div", { class: "w-label" }, "Try these"), ...tasks.map((t, i) => {
      try { if (new Function("node", "cwd", "home", "git", "return " + t.check)(node, cwd, home, git && git.state())) doneTasks.add(i); } catch { /* not yet */ }
      const done = doneTasks.has(i);
      return h("div", { style: `font-size:.88rem;${done ? "color:var(--green)" : ""}` }, (done ? "✓ " : "○ ") + t.text);
    }));
  }
  input.onkeydown = (e) => {
    if (e.key === "Enter") { run(input.value); input.value = ""; }
    else if (e.key === "ArrowUp" && history.length) { hpos = Math.max(0, hpos - 1); input.value = history[hpos]; e.preventDefault(); }
    else if (e.key === "ArrowDown" && history.length) { hpos = Math.min(history.length, hpos + 1); input.value = history[hpos] || ""; e.preventDefault(); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const parts = input.value.split(" "); const last = parts.pop();
      const [dir, partial] = last.includes("/") ? [last.slice(0, last.lastIndexOf("/") + 1), last.slice(last.lastIndexOf("/") + 1)] : ["", last];
      const d = node(resolve(dir || ".")); if (typeof d !== "object") return;
      const m = Object.keys(d).filter((n) => n.startsWith(partial));
      if (m.length === 1) input.value = [...parts, dir + m[0] + (typeof d[m[0]] === "object" ? "/" : "")].join(" ");
      else if (m.length > 1) print(m.join("  "));
    }
  };
  reset.onclick = start;
  start();
}
