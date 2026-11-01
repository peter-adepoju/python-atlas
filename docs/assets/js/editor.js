// A thin wrapper around CodeMirror 5 (loaded as a global from assets/vendor).
import { settings, onSettings } from "./settings.js?v=8fe38f9496";
// On a phone, long lines wrap, so nobody has to scroll sideways inside a small box.
const narrow = () => matchMedia("(max-width: 640px)").matches;
const wrapOn = (s) => s.wrap || narrow();
export function makeEditor(parent, code, { readOnly = false, minLines = 3, onChange, onRun } = {}) {
  const cm = window.CodeMirror(parent, {
    value: code,
    mode: "python",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: !readOnly,
    readOnly,
    viewportMargin: Infinity,
    lineWrapping: wrapOn(settings()),
    extraKeys: {
      Tab: (c) => (c.somethingSelected() ? c.indentSelection("add") : c.replaceSelection("    ", "end")),
      "Shift-Tab": (c) => c.indentSelection("subtract"),
      "Ctrl-Enter": () => onRun && onRun(),
      "Cmd-Enter": () => onRun && onRun(),
      "Ctrl-/": "toggleComment",
      "Cmd-/": "toggleComment",
    },
  });
  onSettings((s) => { cm.setOption("lineWrapping", wrapOn(s)); cm.refresh(); });
  cm.getWrapperElement().style.minHeight = (minLines * 1.5 + 0.8) + "em";
  if (onChange) cm.on("change", () => onChange(cm.getValue()));

  let marks = [];
  return {
    cm,
    get value() { return cm.getValue(); },
    set value(v) { cm.setValue(v); },
    focus() { cm.focus(); },
    refresh() { cm.refresh(); },
    /** Highlight lines: {next: n, prev: n, error: n} (1-based). */
    mark({ next, prev, error } = {}) {
      marks.forEach(([ln, cls]) => cm.removeLineClass(ln, "background", cls));
      marks = [];
      const add = (ln, cls) => { if (ln && ln <= cm.lineCount()) { cm.addLineClass(ln - 1, "background", cls); marks.push([ln - 1, cls]); } };
      add(prev, "line-prev");
      add(next, "line-next");
      add(error, "line-error");
      if (next) cm.scrollIntoView({ line: next - 1, ch: 0 }, 60);
    },
  };
}
