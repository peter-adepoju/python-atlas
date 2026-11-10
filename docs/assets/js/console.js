// Code consoles: editable Python with Run, X-ray, Check and a real-feeling terminal.
import { h, $, $$, toast } from "./site.js?v=86aca22b42";
import { py, onStatus, stop } from "./runtime.js?v=86aca22b42";
import { makeEditor } from "./editor.js?v=86aca22b42";
import { XRay } from "./xray.js?v=86aca22b42";
import { progress } from "./progress.js?v=86aca22b42";

const norm = (s) => String(s).split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");

export function askTutor(context) {
  document.dispatchEvent(new CustomEvent("tutor:ask", { detail: context }));
}

export class PyConsole {
  constructor(el) {
    this.el = el;
    this.kind = el.dataset.kind || "example";
    this.id = el.dataset.id || "";
    this.points = +(el.dataset.points || 0);
    const read = (cls) => { const t = $("textarea." + cls, el); return t ? t.value : null; };
    this.original = (read("pc-code") || "").replace(/\n$/, "");
    // Give exercises an empty line to type on when the starter ends with a comment.
    if (/exercise|bughunt/.test(this.kind) && /(^|\n)\s*#[^\n]*$/.test(this.original)) this.original += "\n";
    this.tests = read("pc-tests");
    this.solution = read("pc-solution");
    this.expected = read("pc-expected");
    this.inputsPreset = read("pc-inputs");
    this.ownFiles = read("pc-files");
    this.hints = $$("template.pc-hint", el).map((t) => t.innerHTML);
    this.prompt = $(".pc-prompt", el);
    $$("textarea.pc-src, template.pc-hint", el).forEach((t) => t.remove());
    this.attempts = 0;
    this.build();
  }

  /** The files this program starts with: the page's files, plus any of the exercise's own. */
  files() {
    const all = {};
    $$("script.page-files").forEach((t) => Object.assign(all, JSON.parse(t.textContent || "{}")));
    if (this.ownFiles) Object.assign(all, JSON.parse(this.ownFiles));
    return JSON.stringify(all);
  }

  showFiles(list) {
    if (!list || !list.length) { this.filesBox.hidden = true; return; }
    const tag = { new: "new", changed: "changed", deleted: "deleted", same: "" };
    this.filesBox.replaceChildren(h("div", { class: "pc-termhead" }, "Files after the run"),
      ...list.map((f) => h("details", { class: "pc-file pc-file-" + f.state, open: f.state === "new" || f.state === "changed" },
        h("summary", {}, h("code", {}, f.name), tag[f.state] ? h("span", { class: "pc-filetag" }, tag[f.state]) : ""),
        f.state === "deleted" ? h("p", { class: "muted" }, "This file was deleted.") : h("pre", { class: "pc-filetext" }, f.text || "(empty)"))));
    this.filesBox.hidden = false;
  }

  saved() { return this.id ? progress.get("code:" + this.id) : undefined; }

  build() {
    const el = this.el;
    const start = (this.saved() && this.saved().code) || this.original;
    this.edWrap = h("div", { class: "pc-editor" });
    this.term = h("pre", { class: "pc-term", "aria-live": "polite", tabindex: "-1" });
    this.termWrap = h("div", { class: "pc-termwrap", hidden: true }, h("div", { class: "pc-termhead" }, "Output"), this.term);
    this.errBox = h("div", { class: "pc-error", hidden: true });
    this.testBox = h("div", { class: "pc-tests", hidden: true });
    this.filesBox = h("div", { class: "pc-files", hidden: true });
    this.status = h("span", { class: "pc-status", "aria-live": "polite" });
    this.xrayHost = h("div", { class: "pc-xrayhost" });

    const btn = (label, cls, fn, title) => h("button", { type: "button", class: "btn " + cls, onclick: fn, title }, label);
    this.runBtn = btn("Run", "btn-run", () => this.run(), "Run (Ctrl+Enter)");
    const bar = h("div", { class: "pc-bar" }, this.runBtn);
    bar.append(btn("X-ray", "btn-quiet", () => this.xray(), "Step through line by line and see memory"));
    if (this.tests) bar.append(this.checkBtn = btn("Check my answer", "btn-check", () => this.check()));
    bar.append(btn("Reset", "btn-quiet", () => this.reset(), "Go back to the starting code"));
    this.stopBtn = btn("Stop", "btn-stop", () => stop("stopped"));
    this.stopBtn.hidden = true;
    bar.append(this.stopBtn);
    if (this.hints.length) { this.hintBtn = btn("Hint", "btn-quiet", () => this.hint()); bar.append(this.hintBtn); }
    if (this.solution) { this.solBtn = btn("Show a solution", "btn-quiet", () => this.showSolution()); this.solBtn.hidden = true; bar.append(this.solBtn); }
    bar.append(this.status);

    const kids = [];
    if (this.kind === "predict") {
      this.guess = h("textarea", { class: "pc-guess", rows: 2, placeholder: "Type exactly what you think it will print…", "aria-label": "Your prediction" });
      if (this.id) {
        const g = progress.get("guess:" + this.id);
        if (g && typeof g.text === "string") this.guess.value = g.text;
        this.guess.addEventListener("input", () => {
          clearTimeout(this.guessT);
          this.guessT = setTimeout(() => progress.set("guess:" + this.id, { text: this.guess.value }), 600);
        });
      }
      this.runBtn.textContent = "Run and compare";
      kids.push(h("label", { class: "pc-guesslabel" }, "Predict first. What will this print?"), this.guess);
    }
    this.hintArea = h("div", { class: "pc-hints" });
    this.solArea = h("div", { class: "pc-sol", hidden: true });
    el.append(this.edWrap, ...kids, bar, this.termWrap, this.filesBox, this.errBox, this.testBox, this.hintArea, this.solArea, this.xrayHost);

    const lines = Math.max(3, start.split("\n").length);
    this.ed = makeEditor(this.edWrap, start, {
      minLines: Math.min(lines, 14),
      onRun: () => this.run(),
      onChange: (v) => {
        if (!this.id || this.kind === "example" || this.kind === "predict") return;
        clearTimeout(this.saveT);
        this.saveT = setTimeout(() => progress.update("code:" + this.id, () => ({ code: v })), 800);
      },
    });
    if (this.id && progress.get("ex:" + this.id) && progress.get("ex:" + this.id).solved) this.markSolved(false);
    onStatus((s) => {
      if (s === "loading") this.status.textContent = "Starting Python (first time takes a few seconds)…";
      else if (s === "error") this.status.textContent = "Python could not start. Check your connection and reload.";
      else this.status.textContent = "";
    });
  }

  busy(on) {
    this.runBtn.disabled = on;
    if (this.checkBtn) this.checkBtn.disabled = on;
    this.stopBtn.hidden = !on;
    this.el.classList.toggle("is-busy", on);
  }

  clearPanels() {
    this.errBox.hidden = true;
    this.testBox.hidden = true;
    this.filesBox.hidden = true;
    this.ed.mark({});
  }

  showError(err, output) {
    if (!err) return;
    this.ed.mark({ error: err.line });
    const tb = h("pre", { class: "pc-tb" }, err.traceback || "");
    const details = h("details", {}, h("summary", {}, "Full error message"), tb);
    this.errBox.replaceChildren(
      h("div", { class: "pc-errhead" }, h("strong", {}, err.type), err.line ? ` on line ${err.line}` : "", err.message ? h("span", { class: "pc-errmsg" }, ": " + err.message) : ""),
      err.friendly ? h("p", { class: "pc-friendly" }, err.friendly) : "",
      details,
      h("button", { type: "button", class: "btn btn-quiet", onclick: () => askTutor({ kind: "error", code: this.ed.value, error: err, output, task: this.prompt ? this.prompt.innerText : "" }) }, "Ask the tutor about this error"),
    );
    this.errBox.hidden = false;
  }

  async run() {
    if (this.kind === "predict" && !this.guess.value.trim()) {
      this.guess.focus();
      this.status.textContent = "Write your prediction first. That's the point of this one.";
      return;
    }
    this.clearPanels();
    this.busy(true);
    const code = this.ed.value;
    const inputs = this.inputsPreset ? this.inputsPreset.split("\n") : [];
    // A fresh random seed for each run, kept while the program is re-run to collect input.
    const seed = 1 + Math.floor(Math.random() * 2 ** 30);
    let res;
    for (;;) {
      this.term.textContent = "";
      this.termWrap.hidden = false;
      res = await py.run(code, { inputs, seed, files: this.files(), onStdout: (t) => this.write(t) });
      if (res.stopped) {
        this.write(res.stopped === "timeout"
          ? "\n[Stopped after 10 seconds. Is there a loop that never ends?]\n"
          : "\n[Stopped]\n");
        break;
      }
      this.term.textContent = res.output || "";
      if (!res.need_input) break;
      const val = await this.askInput(res.prompt);
      if (val === null) { this.write("\n[Input cancelled]\n"); break; }
      inputs.push(val);
    }
    this.busy(false);
    if (!res.stopped) this.showFiles(res.files);
    if (!res.stopped && !res.output && !res.error && !res.need_input) this.term.append(h("span", { class: "pc-dim" }, "(nothing was printed)"));
    if (res.error) this.showError(res.error, res.output);
    if (this.kind === "predict" && !res.stopped) this.compare(res.output || "", res.error);
    progress.activity(1);
    return res;
  }

  write(t) {
    this.term.append(document.createTextNode(t));
    if (this.term.textContent.length > 100000) this.term.textContent = this.term.textContent.slice(-80000);
    this.term.scrollTop = this.term.scrollHeight;
  }

  askInput(prompt) {
    return new Promise((resolve) => {
      const field = h("input", { class: "pc-in", type: "text", "aria-label": prompt || "Program input", autocomplete: "off", spellcheck: "false" });
      const line = h("span", { class: "pc-inline" }, field);
      this.term.append(line);
      field.focus();
      this.status.textContent = "Your program is waiting: type a value and press Enter.";
      field.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); this.status.textContent = ""; resolve(field.value); }
        if (e.key === "Escape") { this.status.textContent = ""; resolve(null); }
      });
    });
  }

  compare(output, error) {
    const ok = !error && norm(output) === norm(this.guess.value);
    const box = h("div", { class: "pc-verdict " + (ok ? "ok" : "no") },
      ok ? "Spot on. Your mental model matched Python exactly." :
        error ? "It raised an error. Did you predict that? Read the error below, then try the X-ray to see why." :
          "Not quite. Compare your prediction with the real output line by line, then use X-ray to see where they part ways.");
    this.testBox.replaceChildren(box);
    this.testBox.hidden = false;
    if (this.id) progress.update("pred:" + this.id, (p) => ({ correct: (p && p.correct) || ok, tries: ((p && p.tries) || 0) + 1 }));
  }

  async xray() {
    this.clearPanels();
    this.busy(true);
    const inputs = this.inputsPreset ? this.inputsPreset.split("\n") : [];
    const seed = 1 + Math.floor(Math.random() * 2 ** 30);
    let res = await py.trace(this.ed.value, { inputs, seed, files: this.files() });
    // Collect input values like a real run, then trace again with them.
    while (res && res.need_input) {
      this.termWrap.hidden = false;
      this.term.textContent = res.output || "";
      const v = await this.askInput(res.prompt);
      if (v === null) break;
      inputs.push(v);
      res = await py.trace(this.ed.value, { inputs, seed, files: this.files() });
    }
    this.busy(false);
    if (!res || res.stopped) return;
    if (!this.termWrap.hidden) this.term.textContent = res.output || "";
    if (res.error && (res.error.type === "SyntaxError" || res.error.type === "IndentationError")) { this.showError(res.error, ""); return; }
    if (!this.xr) this.xr = new XRay(this.xrayHost, this.ed, { onClose: () => { this.xr = null; } });
    this.xr.load(res);
    this.xr.root.scrollIntoView({ block: "nearest", behavior: "smooth" });
    progress.activity(1);
  }

  async check() {
    this.clearPanels();
    this.busy(true);
    this.attempts++;
    const inputs = this.inputsPreset ? this.inputsPreset.split("\n") : [];
    const res = await py.grade(this.ed.value, this.tests, { inputs, files: this.files() });
    this.busy(false);
    if (res.stopped) { this.status.textContent = "Stopped: the program took too long. Look for a loop that never ends."; return; }
    if (res.error && !res.total) { this.showError(res.error, res.output); return; }
    const list = h("ul", { class: "pc-results" },
      res.results.map((r) => h("li", { class: r.ok ? "ok" : "no" }, h("span", { class: "pc-mark", "aria-hidden": "true" }, r.ok ? "✓" : "✗"),
        h("span", {}, r.name, r.ok || !r.message ? "" : h("span", { class: "pc-why" }, ": " + r.message)))));
    const all = res.total > 0 && res.passed === res.total;
    this.testBox.replaceChildren(
      h("div", { class: "pc-score " + (all ? "ok" : "no") }, all ? (res.total === 1 ? "The check passed." : `All ${res.total} checks passed.`) : `${res.passed} of ${res.total} checks passed.`),
      list);
    this.testBox.hidden = false;
    if (res.error) this.showError(res.error, res.output);
    if (this.id) {
      progress.update("ex:" + this.id, (p) => ({
        solved: (p && p.solved) || all, best: Math.max((p && p.best) || 0, res.passed / Math.max(res.total, 1)),
        tries: ((p && p.tries) || 0) + 1, points: this.points,
      }));
    }
    progress.activity(all ? 5 : 1);
    if (all) this.markSolved(true);
    else if (this.attempts >= 3 && this.solBtn) this.solBtn.hidden = false;
  }

  markSolved(announce) {
    this.el.classList.add("is-solved");
    if (this.solBtn) this.solBtn.hidden = false;
    if (announce) toast(this.points ? `Solved: +${this.points} points` : "Solved", "ok");
  }

  hint() {
    const shown = this.hintArea.children.length;
    if (shown >= this.hints.length) return;
    this.hintArea.append(h("div", { class: "pc-hint", html: `<strong>Hint ${shown + 1}.</strong> ` + this.hints[shown] }));
    if (shown + 1 >= this.hints.length) this.hintBtn.disabled = true;
  }

  showSolution() {
    this.solArea.hidden = false;
    this.solArea.replaceChildren(h("div", { class: "pc-solhead" }, "One possible solution. Compare it with yours. There is usually more than one good answer."));
    makeEditor(this.solArea, this.solution, { readOnly: true, minLines: 2 });
    this.solBtn.hidden = true;
  }

  reset() {
    if (this.ed.value !== this.original && !confirm("Replace your code with the starting code?")) return;
    this.ed.value = this.original;
    this.clearPanels();
    this.termWrap.hidden = true;
  }
}

export function mountConsoles(root = document) {
  return $$(".pc", root).map((el) => new PyConsole(el));
}
