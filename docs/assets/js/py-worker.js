/* Module worker. Runs Python (Pyodide) off the main thread so the page never freezes.
   The page can terminate this worker to stop an endless loop. */
let pyodide = null;
let harness = null;
let ready = null;

function boot(indexURL, harnessURL) {
  if (ready) return ready;
  ready = (async () => {
    const { loadPyodide } = await import(indexURL + "pyodide.mjs");
    pyodide = await loadPyodide({ indexURL });
    const src = await (await fetch(harnessURL)).text();
    pyodide.FS.writeFile("/home/pyodide/harness.py", src);
    harness = pyodide.pyimport("harness");
    postMessage({ type: "ready", version: pyodide.version });
  })();
  return ready;
}

// Packages that ship with Pyodide (numpy, pandas, ...) are fetched the first time code imports them.
// zoneinfo is in the standard library, but needs the tzdata package for its time zone rules.
const loaded = new Set();
async function loadNeeded(code) {
  try {
    if (/\bzoneinfo\b/.test(code) && !loaded.has("tzdata")) { await pyodide.loadPackage("tzdata"); loaded.add("tzdata"); }
    if (/\b(?:against|pytest_run)\(/.test(code) && !loaded.has("pytest")) { await pyodide.loadPackage("pytest"); loaded.add("pytest"); }
    await pyodide.loadPackagesFromImports(code);
  } catch { /* offline, or not a Pyodide package: the import will report it */ }
}

function plain(proxy) {
  const out = proxy.toJs({ dict_converter: Object.fromEntries, create_proxies: false });
  proxy.destroy();
  return out;
}

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === "boot") {
    try { await boot(m.indexURL, m.harnessURL); }
    catch (e) { postMessage({ type: "boot_error", message: String(e) }); }
    return;
  }
  await ready;
  const id = m.id;
  try {
    let result;
    if (m.type === "run" || m.type === "trace" || m.type === "grade") await loadNeeded((m.code || "") + "\n" + (m.tests || ""));
    if (m.type === "run" || m.type === "trace" || m.type === "grade") harness.set_files(m.files || "{}");
    if (m.type === "run") {
      let pending = "";
      let timer = null;
      const flush = () => { if (pending) { postMessage({ type: "stdout", id, text: pending }); pending = ""; } timer = null; };
      const emit = (s) => { pending += s; if (!timer) timer = setTimeout(flush, 30); };
      result = plain(harness.run_program(m.code, pyodide.toPy(m.inputs || []), m.seed || 1, emit));
      if (timer) clearTimeout(timer);
      flush();
    } else if (m.type === "trace") {
      result = plain(harness.trace_program(m.code, pyodide.toPy(m.inputs || []), m.seed || 1));
    } else if (m.type === "grade") {
      result = plain(harness.grade_program(m.code, pyodide.toPy(m.inputs || []), m.seed || 1, m.tests));
    } else if (m.type === "expr") {
      result = plain(harness.expr_steps(m.code, JSON.stringify(m.vars || {})));
    } else if (m.type === "tokens") {
      result = plain(harness.tokens_of(m.code));
    } else if (m.type === "eval") {
      result = plain(m.asStr ? harness.evaluate_str(m.code) : harness.evaluate(m.code));
    } else if (m.type === "call") {
      result = plain(harness.call(m.fn, JSON.stringify(m.args || [])));
    } else if (m.type === "syntax") {
      const r = harness.check_syntax(m.code);
      result = r === undefined || r === null ? null : plain(r);
    }
    postMessage({ type: "result", id, result });
  } catch (e) {
    postMessage({ type: "result", id, result: { error: { type: "InternalError", message: String(e), traceback: String(e), friendly: "" } } });
  }
};
