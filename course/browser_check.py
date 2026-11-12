"""Grade exercises in a real browser, as the live site does.

The validator runs everything in CPython. This script grades exercises in
Chromium with the site's own worker (docs/assets/js/py-worker.js) and the
Pyodide build the site loads from the CDN, so it catches differences between
the two: Pyodide's older SQLite, packages that load differently, and so on.
Each exercise is graded twice, as on the page: its starter should fail and
its solution should pass.

By default it checks the exercises that load pytest or sqlite3, which the
offline Pyodide copy can't. Use --all to check every exercise.

Usage:
  python3 course/browser_check.py              # pytest and sqlite3 exercises, all weeks
  python3 course/browser_check.py w075 w095d2  # only these weeks or days
  python3 course/browser_check.py --all w103   # every exercise in Week 103

Needs: an up-to-date build in docs/ (run course/build.py first), Node with
Playwright and Chromium, and network access to the Pyodide CDN
(cdn.jsdelivr.net). Exits with status 1 if any exercise misbehaves.
"""
import functools
import http.server
import json
import re
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "static" / "py"))
import build  # noqa: E402

# The same tests the worker uses to decide what to load.
PYTEST = re.compile(r"\b(?:against|pytest_run)\(|\bimport pytest\b|\bfrom pytest\b")
SQLITE = re.compile(r"\bsqlite3\b")


def pyodide_url():
    text = (HERE / "static" / "js" / "site.js").read_text()
    return re.search(r'pyodideIndexURL \|\| "([^"]+)"', text).group(1)


def wanted(day_id, filters):
    return not filters or any(day_id.startswith(f) for f in filters)


def collect(filters, every):
    items = []
    for path in sorted((HERE / "content").glob("w*/d*.md")):
        day_id = path.parent.name + path.stem
        if not wanted(day_id, filters):
            continue
        meta, text = build.load_day(path)
        day = build.Day(day_id)
        build.render_body(text, day)
        for ex in day.checks:
            files = {**day.files, **ex.get("files", {})}
            blob = "\n".join([ex.get("solution", ""), ex.get("tests", ""), ex.get("starter", "")]
                             + [v for v in files.values() if isinstance(v, str)])
            kinds = [k for k, rx in (("pytest", PYTEST), ("sqlite3", SQLITE)) if rx.search(blob)]
            if kinds or every:
                items.append({"id": ex["id"], "kinds": kinds, "solution": ex.get("solution", ""),
                              "starter": ex.get("starter", ""), "tests": ex["tests"],
                              "files": json.dumps(files), "inputs": ex.get("inputs", [])})
    return items


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve_docs():
    handler = functools.partial(QuietHandler, directory=str(ROOT / "docs"))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def main(argv):
    every = "--all" in argv
    filters = [a for a in argv if not a.startswith("--")]
    items = collect(filters, every)
    if not items:
        print("No exercises to check.")
        return 0
    print(f"{len(items)} exercises to grade in Chromium "
          f"({sum('pytest' in i['kinds'] for i in items)} pytest, {sum('sqlite3' in i['kinds'] for i in items)} sqlite3)")
    server = serve_docs()
    with tempfile.TemporaryDirectory() as tmp:
        items_path, results_path = Path(tmp) / "items.json", Path(tmp) / "results.json"
        items_path.write_text(json.dumps(items))
        base = f"http://127.0.0.1:{server.server_address[1]}/"
        code = subprocess.call(["node", str(HERE / "browser_check.js"), str(items_path), base,
                                pyodide_url(), str(results_path)])
        results = json.loads(results_path.read_text()) if results_path.exists() else []
    server.shutdown()
    if code != 0 or len(results) != len(items):
        print(f"The browser run stopped early ({len(results)} of {len(items)} graded).")
        return 1
    problems = [r for r in results if not r["solution_ok"] or r["starter_ok"]]
    for r in problems:
        if not r["solution_ok"]:
            print(f"✗ {r['id']}: solution fails in the browser: {r['solution_detail']}")
        if r["starter_ok"]:
            print(f"✗ {r['id']}: starter passes in the browser")
    version = results[0]["version"] if results else "?"
    print(f"{len(results)} exercises graded with Pyodide {version}; {len(problems)} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
