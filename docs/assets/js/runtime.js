// One shared Python runtime for the whole page, living in a Web Worker.
import { SITE } from "./site.js?v=871ff52039";

const listeners = new Set();
let worker = null;
let bootPromise = null;
let status = "idle"; // idle | loading | ready | error
let queue = Promise.resolve();
let current = null;
let nextId = 1;

export function onStatus(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); }
function setStatus(s) { status = s; listeners.forEach((f) => f(s)); }

function start() {
  setStatus("loading");
  worker = new Worker(SITE.root + "assets/js/py-worker.js?v=" + SITE.version, { type: "module" });
  bootPromise = new Promise((resolve, reject) => {
    worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === "ready") { setStatus("ready"); resolve(); return; }
      if (m.type === "boot_error") { setStatus("error"); reject(new Error(m.message)); return; }
      if (!current || m.id !== current.id) return;
      if (m.type === "stdout") current.onStdout && current.onStdout(m.text);
      if (m.type === "result") { const c = current; current = null; clearTimeout(c.timer); c.resolve(m.result); }
    };
    worker.onerror = (e) => { setStatus("error"); reject(e); };
  });
  worker.postMessage({ type: "boot", indexURL: SITE.pyodide, harnessURL: new URL(SITE.root + "assets/py/harness.py?v=" + SITE.version, location.href).href });
  return bootPromise;
}

export function ensure() { return bootPromise || start(); }

/** Stop whatever is running (e.g. an endless loop) by replacing the worker. */
export function stop(reason = "stopped") {
  if (!worker) return;
  worker.terminate();
  worker = null; bootPromise = null;
  if (current) { const c = current; current = null; clearTimeout(c.timer); c.resolve({ stopped: reason }); }
  start();
}

function call(msg, { onStdout, timeout = 0 } = {}) {
  const job = queue.then(async () => {
    await ensure();
    return new Promise((resolve) => {
      const id = nextId++;
      current = { id, resolve, onStdout, timer: null };
      if (timeout) current.timer = setTimeout(() => stop("timeout"), timeout);
      worker.postMessage({ ...msg, id });
    });
  });
  queue = job.catch(() => {});
  return job;
}

export const py = {
  run: (code, opts = {}) => call({ type: "run", code, inputs: opts.inputs || [], seed: opts.seed || 1, files: opts.files },
    { onStdout: opts.onStdout, timeout: opts.timeout ?? 10000 }),
  trace: (code, opts = {}) => call({ type: "trace", code, inputs: opts.inputs || [], seed: opts.seed || 1, files: opts.files }, { timeout: 15000 }),
  grade: (code, tests, opts = {}) => call({ type: "grade", code, tests, inputs: opts.inputs || [], seed: opts.seed || 1, files: opts.files }, { timeout: 15000 }),
  expr: (code, vars) => call({ type: "expr", code, vars }, { timeout: 5000 }),
  tokens: (code) => call({ type: "tokens", code }, { timeout: 5000 }),
  eval: (code, asStr = false) => call({ type: "eval", code, asStr }, { timeout: 5000 }),
  call: (fn, ...args) => call({ type: "call", fn, args }, { timeout: 8000 }),
  syntax: (code) => call({ type: "syntax", code }, { timeout: 5000 }),
};
