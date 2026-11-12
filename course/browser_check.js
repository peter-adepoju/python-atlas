// Grades exercises in Chromium with the site's own worker. Run it through course/browser_check.py.
// Usage: node browser_check.js ITEMS.json BASE_URL PYODIDE_URL RESULTS.json
const fs = require("fs");
const { chromium } = require("playwright");

const [itemsPath, base, pyodideURL, resultsPath] = process.argv.slice(2);
const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));

// Runs in the page: start a fresh worker for one day, grade each exercise's starter and solution.
async function gradeDay({ list, pyodideURL }) {
  const worker = new Worker("../assets/js/py-worker.js?v=browser-check", { type: "module" });
  const waiting = {};
  let next = 0;
  const booted = new Promise((resolve, reject) => {
    worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === "ready") resolve(m.version);
      else if (m.type === "boot_error") reject(new Error(m.message));
      else if (m.type === "result" && waiting[m.id]) { waiting[m.id](m.result); delete waiting[m.id]; }
    };
  });
  worker.postMessage({ type: "boot", indexURL: pyodideURL,
                       harnessURL: new URL("../assets/py/harness.py?v=browser-check", location.href).href });
  const version = await booted;
  const grade = (code, item) => new Promise((resolve) => {
    const id = ++next;
    const timer = setTimeout(() => { delete waiting[id]; resolve({ timeout: true }); }, 180000);
    waiting[id] = (result) => { clearTimeout(timer); resolve(result); };
    worker.postMessage({ type: "grade", id, code, inputs: item.inputs || [], seed: 1, tests: item.tests, files: item.files });
  });
  const summarise = (result) => {
    if (!result || result.timeout) return { ok: false, detail: "timed out after 180 seconds" };
    const checks = result.results || [];
    const failed = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.message}`);
    const error = result.error ? `${result.error.type}: ${result.error.message}` : "";
    return { ok: checks.length > 0 && failed.length === 0, detail: [failed.join(" | "), error].join(" ").trim().slice(0, 400) };
  };
  const out = [];
  for (const item of list) {
    const starter = summarise(await grade(item.starter, item));
    const solution = summarise(await grade(item.solution, item));
    out.push({ id: item.id, kinds: item.kinds, version, solution_ok: solution.ok, solution_detail: solution.detail,
               starter_ok: starter.ok, starter_detail: starter.detail });
  }
  worker.terminate();
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("page error:", String(e)));
  await page.goto(new URL("days/w001d1.html", base).href);
  const days = {};
  for (const item of items) (days[item.id.split("-")[0]] ||= []).push(item);
  const results = [];
  for (const [day, list] of Object.entries(days)) {
    const start = Date.now();
    const graded = await page.evaluate(gradeDay, { list, pyodideURL });
    results.push(...graded);
    fs.writeFileSync(resultsPath, JSON.stringify(results));
    const bad = graded.filter((r) => !r.solution_ok || r.starter_ok).map((r) => r.id);
    console.log(`${day}: ${graded.length} graded in ${((Date.now() - start) / 1000).toFixed(0)}s${bad.length ? ", problems: " + bad.join(", ") : ""}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
