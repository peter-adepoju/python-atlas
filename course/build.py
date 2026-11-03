"""Build the course website into ../docs and the Colab notebooks into ../docs/notebooks.

Usage:  python course/build.py

Lessons are Markdown files in course/content/wNNN/dD.md with a few extra blocks
(see course/AUTHORING.md). Everything under course/static is copied to docs/assets.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import shlex
import shutil
import sys
from pathlib import Path

import markdown
import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import curriculum  # noqa: E402

ROOT = HERE.parent
OUT = ROOT / "docs"
CONTENT = HERE / "content"
STATIC = HERE / "static"
TEMPLATES = HERE / "templates"
REPO = "peter-adepoju/python-atlas"
BRANCH = "main"


def _asset_version() -> str:
    """A short hash of everything in course/static, so browsers fetch fresh files after any change."""
    import hashlib
    h = hashlib.sha256()
    for f in sorted(STATIC.rglob("*")):
        if f.is_file() and "__pycache__" not in f.parts:
            h.update(str(f.relative_to(STATIC)).encode())
            h.update(f.read_bytes())
    return h.hexdigest()[:10]


VERSION = _asset_version()

MD_EXT = ["tables", "fenced_code", "attr_list", "md_in_html", "sane_lists", "smarty"]


def md(text: str) -> str:
    return markdown.markdown(text, extensions=MD_EXT, output_format="html5")


def md_inline(text: str) -> str:
    out = md(text).strip()
    if out.startswith("<p>") and out.endswith("</p>") and out.count("<p>") == 1:
        out = out[3:-4]
    return out


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def src(cls: str, text: str) -> str:
    return f'<textarea class="pc-src {cls}" hidden>{esc(text)}</textarea>'


# ------------------------------------------------------------------ blocks

BLOCK_RE = re.compile(r"^:::(\w[\w-]*)(.*?)\n(.*?)^:::\s*$", re.S | re.M)


def parse_attrs(s: str) -> tuple[list[str], dict]:
    args, kw = [], {}
    for tok in shlex.split(s.strip()):
        if "=" in tok:
            k, v = tok.split("=", 1)
            kw[k] = v
        else:
            args.append(tok)
    return args, kw


def split_parts(body: str) -> tuple[str, dict]:
    """Split a block body on lines like '@@starter'. Returns (lead text, {part: [texts]})."""
    parts: dict[str, list[str]] = {}
    lead = []
    cur = None
    buf: list[str] = []
    for line in body.split("\n"):
        m = re.match(r"^@@(\w+)\s*$", line)
        if m:
            if cur is None:
                lead = buf
            else:
                parts.setdefault(cur, []).append("\n".join(buf).strip("\n"))
            cur, buf = m.group(1), []
        else:
            buf.append(line)
    if cur is None:
        lead = buf
    else:
        parts.setdefault(cur, []).append("\n".join(buf).strip("\n"))
    return "\n".join(lead).strip("\n"), parts


def parse_files(body: str) -> dict:
    """Files written as '=== name' followed by the file's lines."""
    files, name, buf = {}, None, []
    for line in body.split("\n"):
        m = re.match(r"^=== (\S.*?)\s*$", line)
        if m:
            if name is not None:
                files[name] = "\n".join(buf).rstrip("\n") + "\n"
            name, buf = m.group(1), []
        elif name is not None:
            buf.append(line)
    if name is not None:
        files[name] = "\n".join(buf).rstrip("\n") + "\n"
    return files


def files_view(files: dict, open_all=False) -> str:
    return "".join(f'<details class="pc-file"{" open" if open_all else ""}><summary><code>{esc(n)}</code></summary>'
                   f'<pre class="pc-filetext">{esc(t)}</pre></details>' for n, t in files.items())


def files_cell(files: dict) -> str:
    """A notebook cell that creates the files, so the notebook works on its own."""
    lines = ["# Run this cell first: it creates the files used below."]
    for n, t in files.items():
        lines.append(f"with open({n!r}, 'w', encoding='utf-8') as f:\n    f.write({t!r})")
    return "\n".join(lines)


class Day:
    """Collects per-day material while rendering (for notebooks and review cards)."""

    def __init__(self, day_id):
        self.id = day_id
        self.cells = []  # notebook cells: (kind, text)
        self.cards = []
        self.counter = 0
        self.exercises = []
        self.checks = []
        self.examples = []
        self.files = {}

    def uid(self, prefix):
        self.counter += 1
        return f"{self.id}-{prefix}{self.counter}"


def render_block(kind, attrs, body, day: Day) -> str:
    args, kw = parse_attrs(attrs)
    title = kw.get("title", "")
    head = f'<div class="pc-title">{md_inline(title)}</div>' if title else ""

    if kind in ("example", "predict"):
        lead, parts = split_parts(body)
        code = parts.get("code", [lead])[0] if "code" in parts else lead
        inputs = parts.get("inputs", [None])[0]
        pid = kw.get("id") or day.uid("p" if kind == "predict" else "e")
        extra = src("pc-inputs", inputs) if inputs else ""
        intro = md(lead) if "code" in parts else ""
        day.cells.append(("md", ("**Predict before you run:** what will this print?\n\n" if kind == "predict" else "") + (lead if "code" in parts else "")))
        if kw.get("forever") == "yes":
            day.cells.append(("md", "This cell never finishes on its own. Run it, then press the stop button (the square at the top of the notebook, or **Runtime, Interrupt execution** in Colab)."))
        day.cells.append(("code", code))
        if "nb_after" in kw:
            day.cells.append(("md", "Run the next cell to undo the damage, so the rest of this notebook works:"))
            day.cells.append(("code", kw["nb_after"].replace("\\n", "\n")))
        day.examples.append({"id": pid, "code": code, "inputs": inputs or (kw["try"].replace(",", "\n") if "try" in kw else None),
                             "expect_error": kw.get("error") == "yes", "forever": kw.get("forever") == "yes"})
        return (f'<div class="pc pc-{kind}" data-kind="{kind}" data-id="{pid}">{head}{intro}'
                f'{src("pc-code", code)}{extra}</div>')

    if kind in ("exercise", "bughunt"):
        lead, parts = split_parts(body)
        eid = kw.get("id") or day.uid("x")
        eid = f"{day.id}-{eid}" if not eid.startswith(day.id) else eid
        pts = kw.get("points", "10")
        starter = parts.get("starter", [""])[0]
        tests = parts.get("tests", [""])[0]
        sol = parts.get("solution", [""])[0]
        inputs = parts.get("inputs", [None])[0]
        own_files = parse_files(parts["files"][0]) if "files" in parts else {}
        exam = kw.get("exam") == "yes"
        hints = "" if exam else "".join(f'<template class="pc-src pc-hint">{md_inline(t)}</template>' for t in parts.get("hint", []))
        label = "Bug hunt" if kind == "bughunt" else "Exercise"
        day.exercises.append({"id": eid, "title": title, "points": int(pts)})
        day.checks.append({"id": eid, "starter": starter, "tests": tests, "solution": sol, "inputs": inputs, "files": own_files})
        day.cells.append(("md", f"### {label}: {title}\n\n{lead}"))
        if own_files:
            day.cells.append(("code", files_cell(own_files)))
        day.cells.append(("code", starter or "# Write your code here\n"))
        if tests:
            day.cells.append(("check", tests))
        return (f'<div class="pc pc-exercise pc-{kind}" data-kind="{kind}" data-id="{eid}" data-points="{pts}">'
                f'<div class="pc-label"><span>{label}</span><span class="pc-pts">{pts} points</span></div>{head}'
                f'<div class="pc-prompt">{md(lead)}{files_view(own_files) if own_files else ""}</div>'
                f'{src("pc-code", starter)}{src("pc-tests", tests) if tests else ""}{src("pc-files", json.dumps(own_files)) if own_files else ""}'
                f'{src("pc-solution", sol) if sol and not exam else ""}{src("pc-inputs", inputs) if inputs else ""}{hints}</div>')

    if kind == "parsons":
        lead, parts = split_parts(body)
        pid = f"{day.id}-{kw.get('id') or day.uid('z')}"
        data = {"lines": [l for l in parts.get("lines", [""])[0].split("\n") if l.strip()],
                "distractors": [l for l in parts.get("distractors", [""])[0].split("\n") if l.strip()]}
        day.cells.append(("md", f"### Puzzle: {title}\n\n{lead}\n\n(Put these lines in order on the website.)"))
        return (f'<div class="parsons" data-id="{pid}"><div class="pc-label"><span>Puzzle</span></div>{head}'
                f'<div class="pc-prompt">{md(lead)}</div>'
                f'<script type="application/json">{json.dumps(data)}</script></div>')

    if kind == "quiz":
        qid = f"{day.id}-{kw.get('id') or day.uid('q')}"
        try:
            qs = yaml.safe_load(body)
        except yaml.YAMLError as e:
            raise ValueError(f"Quiz YAML error in {day.id}: {e}") from None
        out = []
        for i, q in enumerate(qs):
            item = {"type": q.get("type", "mc"), "q": md_inline(q["q"]),
                    "answer": q["answer"], "explain": md_inline(q.get("explain", ""))}
            if "options" in q:
                item["options"] = [md_inline(str(o)) for o in q["options"]]
            if "code" in q:
                item["code"] = q["code"].rstrip("\n")
            out.append(item)
            day.cards.append({"id": f"{qid}#{i}", "day": day.id, **item})
        day.cells.append(("md", "### Quiz\n\nTake this quiz on the website: it is marked for you and feeds your daily review."))
        return (f'<div class="quiz" data-id="{qid}"><div class="pc-label"><span>Quiz</span><span>{len(out)} questions</span></div>{head}'
                f'<script type="application/json">{json.dumps(out)}</script></div>')

    if kind == "files":
        files = parse_files(body)
        day.files.update(files)
        day.cells.append(("md", "These are the files this page's programs use."))
        day.cells.append(("code", files_cell(files)))
        label = title or ("The file used on this page" if len(files) == 1 else "The files used on this page")
        return (f'<div class="filebox"><div class="filebox-head">{esc(label)}<span>Every program on this page starts with a fresh copy. Click a name to see what\'s inside.</span></div>'
                f'{files_view(files)}<script type="application/json" class="page-files">{json.dumps(files)}</script></div>')

    if kind == "widget":
        name = args[0]
        params = body.strip() or "{}"
        json.loads(params)  # validate
        cap = kw.get("caption", "")
        day.cells.append(("md", f"*Interactive figure on the website: {cap or name}.*"))
        return (f'<figure class="widget" data-widget="{esc(name)}">'
                f'<script type="application/json">{params}</script>'
                f'<div class="widget-body"><p class="widget-loading">Loading interactive figure…</p></div>'
                + (f'<figcaption>{md_inline(cap)}</figcaption>' if cap else "") + "</figure>")

    if kind == "stepper":
        lead, parts = split_parts(body)
        exprs = [l for l in lead.split("\n") if l.strip()]
        variables = parts.get("vars", ["{}"])[0]
        cap = kw.get("caption", "")
        day.cells.append(("code", "\n".join(f"print({e})" for e in exprs)))
        params = json.dumps({"exprs": exprs, "vars": json.loads(variables)})
        return (f'<figure class="widget" data-widget="stepper"><script type="application/json">{params}</script>'
                f'<div class="widget-body"></div>' + (f'<figcaption>{md_inline(cap)}</figcaption>' if cap else "") + "</figure>")

    if kind in ("note", "tip", "warn", "key", "mistake", "think"):
        labels = {"note": "Note", "tip": "Tip", "warn": "Careful", "key": "Key idea",
                  "mistake": "Common mistake", "think": "Think about it"}
        t = title or labels[kind]
        day.cells.append(("md", f"> **{t}.** " + body.strip().replace("\n", "\n> ")))
        return f'<aside class="callout c-{kind}"><div class="callout-t">{md_inline(t)}</div>{md(body)}</aside>'

    raise ValueError(f"Unknown block :::{kind} in {day.id}")


def render_body(text: str, day: Day) -> str:
    pieces = []
    pos = 0
    for m in BLOCK_RE.finditer(text):
        before = text[pos:m.start()]
        if before.strip():
            pieces.append(("md", before))
        pieces.append(("blk", render_block(m.group(1), m.group(2), m.group(3), day)))
        pos = m.end()
    if text[pos:].strip():
        pieces.append(("md", text[pos:]))
    html_out = []
    for kind, val in pieces:
        if kind == "md":
            day.cells.append(("md", val.strip()))
            html_out.append(md(val))
        else:
            html_out.append(val)
    return "\n".join(html_out)


def add_heading_ids(body: str):
    toc = []
    used = set()

    def repl(m):
        level, inner = m.group(1), m.group(2)
        text = html.unescape(re.sub("<[^>]+>", "", inner))
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "s"
        base, n = slug, 2
        while slug in used:
            slug, n = f"{base}-{n}", n + 1
        used.add(slug)
        if level == "2":
            toc.append((slug, text))
        return f'<h{level} id="{slug}">{inner}</h{level}>'

    return re.sub(r"<h([23])>(.*?)</h\1>", repl, body), toc


# ------------------------------------------------------------------ notebooks

CHECK_HELPER = '''# Run this cell once. It lets you check exercise answers inside this notebook.
# Workflow: run your exercise cell, then immediately run the "check" cell below it.
import io, builtins

def check(tests_src):
    """Run an exercise's tests against the cell you ran just before this one."""
    ip = get_ipython()
    code = ip.user_ns["In"][-2]
    def run(feed=(), echo=False):
        out = io.StringIO(); q = [str(x) for x in feed]; real_in, real_print = builtins.input, builtins.print
        def fake_input(p=""):
            if not q:
                raise AssertionError("The program asked for more input than the test gave it.")
            v = q.pop(0); out.write(str(p) + (v + "\\n" if echo else "")); return v
        def fake_print(*a, **k):
            k.setdefault("file", out); real_print(*a, **k)
        builtins.input, builtins.print = fake_input, fake_print
        try:
            exec(code, {"__name__": "__main__"})
        finally:
            builtins.input, builtins.print = real_in, real_print
        return out.getvalue()
    norm = lambda t: "\\n".join(l.rstrip() for l in str(t).rstrip().splitlines())
    def expect_output(want, inputs=(), echo=False):
        got = run(inputs, echo)
        assert norm(got) == norm(want), f"expected {norm(want)!r} but got {norm(got)!r}"
    import re
    uses = lambda *names: all(re.search(r"\\b" + re.escape(n) + r"\\b", code) for n in names)
    def run_with(subs, feed=(), echo=False):
        nonlocal code
        saved = code
        for old, new in subs.items():
            code = code.replace(old, new, 1)
        try:
            return run(feed, echo)
        finally:
            code = saved
    env = dict(ip.user_ns, run=run, norm=norm, source=code, expect_output=expect_output, uses=uses, run_with=run_with)
    try:
        env["output"] = run()
    except AssertionError:
        env["output"] = ""
    exec(tests_src, env)
    tests = [(k, v) for k, v in env.items() if k.startswith("test_") and callable(v)]
    ok = 0
    for name, fn in tests:
        label = (fn.__doc__ or name[5:].replace("_", " ")).strip()
        try:
            fn(); ok += 1; print("✓", label)
        except AssertionError as e:
            print("✗", label + ":", e or "not quite yet")
    print(f"{ok} of {len(tests)} checks passed.")
'''


def notebook(day_meta, day: Day) -> dict:
    cells = []

    def mdcell(t):
        cells.append({"cell_type": "markdown", "metadata": {}, "source": t.splitlines(keepends=True)})

    def codecell(t):
        cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
                      "source": t.splitlines(keepends=True)})

    site = f"https://{REPO.split('/')[0]}.github.io/{REPO.split('/')[1]}/days/{day.id}.html"
    mdcell(f"# Week {day_meta['week']}, Day {day_meta['day']}: {day_meta['title']}\n\n"
           f"Companion notebook. The interactive figures, X-ray views, quizzes and auto-marked "
           f"exercises are on the [lesson page]({site}). Use this notebook to keep your own copy of the code.\n\n"
           "**How to use it:** run each cell with Shift+Enter. Change the code and run it again: that's how you learn.")
    has_check = any(k == "check" for k, _ in day.cells)
    if has_check:
        codecell(CHECK_HELPER)
    for kind, text in day.cells:
        if not text.strip():
            continue
        if kind == "md":
            mdcell(text)
        elif kind == "code":
            codecell(text)
        elif kind == "check":
            codecell("# Check: run the exercise cell above first, then this one.\n"
                     f"check({json.dumps(text)})")
    return {"cells": cells, "metadata": {"kernelspec": {"name": "python3", "display_name": "Python 3"},
                                         "language_info": {"name": "python"}, "colab": {"provenance": []}},
            "nbformat": 4, "nbformat_minor": 5}


# ------------------------------------------------------------------ pages

def template(name):
    return (TEMPLATES / name).read_text()


SITE_URL = "https://peter-adepoju.github.io/python-atlas/"
DEFAULT_DESC = ("A free Python course that takes you from your first line of code to mastery: daily lessons, "
                "Python running in your browser, step-by-step views of memory, exercises, quizzes and spaced review.")
SITEMAP: list[str] = []


def plain(text: str) -> str:
    """Markdown to one line of plain text, for meta descriptions."""
    t = re.sub(r"<[^>]+>", "", md(text or ""))
    t = html.unescape(re.sub(r"\s+", " ", t)).strip()
    return t if len(t) <= 160 else t[:157].rsplit(" ", 1)[0] + "..."


def seo_head(path: str, title: str, desc: str, index: bool) -> str:
    url = SITE_URL + ("" if path == "index.html" else path)
    if index:
        SITEMAP.append(url)
    d = esc(desc or DEFAULT_DESC)
    t = esc(title)
    tags = [f'<meta name="description" content="{d}">']
    if not index:
        tags.append('<meta name="robots" content="noindex">')
    tags += [f'<link rel="canonical" href="{url}">',
             '<meta property="og:site_name" content="Python Atlas">',
             '<meta property="og:type" content="website">',
             f'<meta property="og:title" content="{t}">',
             f'<meta property="og:description" content="{d}">',
             f'<meta property="og:url" content="{url}">',
             f'<meta property="og:image" content="{SITE_URL}assets/img/share.png">',
             '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
             '<meta name="twitter:card" content="summary_large_image">']
    return "\n".join(tags)


def icon(name):
    """An icon's URL with a fingerprint of its contents, so a changed icon gets a new address
    and no browser, phone or service worker keeps showing the old one."""
    digest = hashlib.md5((STATIC / "img" / name).read_bytes()).hexdigest()[:10]
    return f"assets/img/{name}?v={digest}"


def page(title, body, depth=0, extra_head="", scripts="", page_class="", path="", desc="", index=True):
    root = "../" * depth
    base = template("base.html")
    if path:
        extra_head = seo_head(path, title, desc, index) + "\n" + extra_head
    return (base.replace("{{title}}", esc(title))
            .replace("{{root}}", root)
            .replace("{{version}}", VERSION)
            .replace("{{icon_svg}}", icon("icon.svg"))
            .replace("{{icon_apple}}", icon("apple-touch-icon.png"))
            .replace("{{manifest_v}}", hashlib.md5(json.dumps([icon(n) for n in ("app-192.png", "app-512.png", "app-maskable-512.png")]).encode()).hexdigest()[:10])
            .replace("{{extra_head}}", extra_head)
            .replace("{{page_class}}", page_class)
            .replace("{{scripts}}", scripts)
            .replace("{{body}}", body))


def load_day(path: Path):
    text = path.read_text()
    meta = {}
    if text.startswith("---"):
        _, fm, text = text.split("---", 2)
        meta = yaml.safe_load(fm) or {}
    return meta, text


HERO_CODE = """savings = 1000
years = 0
while savings < 1300:
    savings = savings * 1.05
    years = years + 1
print("Years:", years)"""


def hero_trace():
    sys.path.insert(0, str(STATIC / "py"))
    import harness
    r = harness.trace_program(HERO_CODE, [], 1)
    steps, prev = [], {}
    for st in r["steps"]:
        heap = {o["id"]: o for o in st["heap"]}
        cur = {}
        for k, oid in st["stack"][0]["vars"]:
            o = heap[oid]
            v = o.get("repr", o["type"])
            if o["type"] == "float":
                v = repr(round(float(v), 2))
            cur[k] = v
        steps.append({"line": st["line"], "out": st["stdout"],
                      "vars": [[k, v, prev.get(k) != v] for k, v in cur.items()]})
        prev = cur
    return {"code": HERO_CODE, "steps": steps}


def guide_fill(body: str, cmap: dict) -> str:
    """Fill the guide's numbers and phase list from the curriculum, so they always match the map."""
    weeks = cmap["weeks"]
    days = sum(len(w.get("days") or []) for w in weeks)
    install = next((w["week"] for w in weeks for d in (w.get("days") or []) if d["title"] == "Installing Python"), None)
    ribbon, phases = [], []
    for p in cmap["phases"]:
        pw = [w for w in weeks if w["phase"] == p["id"]]
        lesson = [w for w in pw if not w["rest"]]
        rest = len(pw) - len(lesson)
        first, last = pw[0]["week"], pw[-1]["week"]
        ribbon.append(f'<a href="#phase-{p["id"]}" style="flex:{len(pw)}" class="r{p["id"]}" title="{esc(p["title"])}"></a>')
        sample = "".join(f"<li>{esc(w['title'])}</li>" for w in lesson[:4])
        more = len(lesson) - 4
        rest_txt = f", {rest} rest week{'s' if rest != 1 else ''}" if rest else ""
        phases.append(
            f'<li class="gd-phase" id="phase-{p["id"]}"><span class="gd-pn r{p["id"]}">{p["id"]}</span>'
            f'<div class="gd-pbody"><div class="gd-ptop"><h3>{esc(p["title"])}</h3>'
            f'<span class="gd-pweeks">Weeks {first} to {last}<span>{len(lesson)} lesson weeks{rest_txt}</span></span></div>'
            f'<p>{esc(p["summary"])}</p>'
            f'<ul class="gd-chips">{sample}' + (f'<li class="more"><a href="map.html">+{more} more</a></li>' if more > 0 else "") + "</ul></div></li>")
    return (body.replace("{{g_weeks}}", str(len(weeks))).replace("{{g_days}}", str(days))
            .replace("{{g_hours}}", f"{days * 3 // 100 * 100:,}+").replace("{{g_install_week}}", str(install))
            .replace("{{g_ribbon}}", "".join(ribbon)).replace("{{g_phases}}", "".join(phases)))


PAGE_DESC = {
    "map.html": "The full Python Atlas course map: seven phases and 104 weeks, from first programs to data structures, algorithms, advanced Python and a capstone.",
    "guide.html": "How Python Atlas works: the plan, how long it takes, what a three-hour day looks like, and how to learn faster.",
    "playground.html": "Write and run Python in your browser, with nothing to install. Step through any program line by line and watch memory change.",
    "privacy.html": "What Python Atlas stores about you, where it is kept, and how to delete it.",
}


def build():
    course = curriculum.build()
    if OUT.exists():
        for child in OUT.iterdir():
            if child.name in ("CNAME", ".nojekyll"):
                continue
            shutil.rmtree(child) if child.is_dir() else child.unlink()
    OUT.mkdir(exist_ok=True)
    (OUT / ".nojekyll").write_text("")
    shutil.copytree(STATIC, OUT / "assets", ignore=shutil.ignore_patterns("__pycache__"))
    # Version every module import, so a browser never mixes old and new scripts after an update.
    for js in (OUT / "assets" / "js").rglob("*.js"):
        text = js.read_text()
        js.write_text(re.sub(r"""(["'`])(\.{1,2}/[^"'`\n]*?\.js)\1""", lambda m: f"{m[1]}{m[2]}?v={VERSION}{m[1]}", text))
    (OUT / "days").mkdir()
    (OUT / "notebooks").mkdir()

    flat = [(w, d) for w in course["weeks"] for d in w["days"]]
    search = []
    built = {}
    cards = []
    for w, d in flat:
        f = CONTENT / f"w{w['week']:03d}" / f"d{d['day']}.md"
        if f.exists():
            built[d["id"]] = f
    index = {"phases": course["phases"], "weeks": course["weeks"], "built": sorted(built)}
    (OUT / "assets" / "data").mkdir(exist_ok=True)

    for n, (w, d) in enumerate(flat):
        if d["id"] not in built:
            continue
        meta, text = load_day(built[d["id"]])
        day = Day(d["id"])
        body = render_body(text, day)
        body, toc = add_heading_ids(body)
        cards += day.cards
        prev_d = next((x for x in reversed(flat[:n]) if x[1]["id"] in built), None)
        next_d = next((x for x in flat[n + 1:] if x[1]["id"] in built), None)
        # The page title is the same short title shown on the course map.
        dm = {"week": w["week"], "day": d["day"], "title": d["title"], "id": d["id"]}
        nb = notebook(dm, day)
        (OUT / "notebooks" / f"{d['id']}.ipynb").write_text(json.dumps(nb, indent=1))
        colab = f"https://colab.research.google.com/github/{REPO}/blob/{BRANCH}/docs/notebooks/{d['id']}.ipynb"
        phase = course["phases"][w["phase"] - 1]
        steps = meta.get("plan", [])
        total = sum(p[0] for p in steps) or 1
        t0, plan_rows, bar = 0, [], []
        for i, (mins, what) in enumerate(steps):
            plan_rows.append(f'<li><span class="plan-at">{t0 // 60}:{t0 % 60:02d}</span>'
                             f'<span class="plan-what">{md_inline(what)}</span><span class="plan-min">{mins} min</span></li>')
            bar.append(f'<span class="plan-seg s{i % 2}" style="flex:{mins}" title="{esc(what)}: {mins} min"></span>')
            t0 += mins
        hours = f"{total // 60} h" + (f" {total % 60} min" if total % 60 else "")
        plan = (f'<div class="plan-bar" aria-hidden="true">{"".join(bar)}</div>'
                f'<ol class="plan-list">{"".join(plan_rows)}</ol>')
        goals = "".join(f"<li>{md_inline(g)}</li>" for g in meta.get("goals", []))
        toc_html = "".join(f'<li><a href="#{s}" data-sec="{s}">{esc(t)}</a></li>' for s, t in toc)
        pts = sum(x["points"] for x in day.exercises)
        nav = []
        if prev_d:
            nav.append(f'<a class="btn btn-quiet" href="{prev_d[1]["id"]}.html">Previous day</a>')
        nav.append('<button type="button" class="btn btn-quiet" id="save-progress" title="Progress is also saved automatically as you work">Save progress</button>')
        nav.append('<button type="button" class="btn btn-run" id="mark-done">Mark today complete</button>')
        if next_d:
            nav.append(f'<a class="btn btn-step" href="{next_d[1]["id"]}.html">Next day</a>')
        data = {"id": d["id"], "week": w["week"], "day": d["day"], "title": dm["title"],
                "exercises": day.exercises, "points": pts}
        tpl = template("day.html")
        html_body = (tpl.replace("{{week}}", str(w["week"])).replace("{{day}}", str(d["day"]))
                     .replace("{{crumbs}}", f'<ol class="crumbs" aria-label="You are here"><li><a href="../map.html">Course map</a></li>'
                              f'<li><a href="../map.html#phase-{phase["id"]}">Phase {phase["id"]}: {esc(phase["title"])}</a></li>'
                              f'<li><a href="../map.html#week-{w["week"]}">Week {w["week"]}: {esc(w["title"])}</a></li>'
                              f'<li aria-current="page">Day {d["day"]} of {len(w["days"])}</li></ol>')
                     .replace("{{phase}}", esc(f"Phase {phase['id']}: {phase['title']}"))
                     .replace("{{week_title}}", esc(w["title"]))
                     .replace("{{title}}", esc(dm["title"]))
                     .replace("{{forge}}", '<span class="forge-tag">Forge day</span>' if d["forge"] else "")
                     .replace("{{intro}}", md(meta.get("intro", "")))
                     .replace("{{goals}}", goals).replace("{{plan}}", plan).replace("{{hours}}", hours)
                     .replace("{{toc}}", toc_html).replace("{{body}}", body)
                     .replace("{{colab}}", colab).replace("{{notebook}}", f"../notebooks/{d['id']}.ipynb")
                     .replace("{{nav}}", "".join(nav)).replace("{{points}}", str(pts))
                     .replace("{{data}}", json.dumps(data)))
        search.append({"k": "day", "u": f"days/{d['id']}.html", "id": d["id"], "t": dm["title"], "w": w["week"], "d": d["day"],
                       "p": phase["id"], "wt": w["title"], "s": [t for _, t in toc], "g": [plain(g) for g in meta.get("goals", [])]})
        (OUT / "days" / f"{d['id']}.html").write_text(
            page(f"Week {w['week']} Day {d['day']}: {dm['title']}", html_body, depth=1,
                 path=f"days/{d['id']}.html", desc=plain(meta.get("intro", "")),
                 scripts=f'<script type="module" src="../assets/js/pages/day.js?v={VERSION}"></script>', page_class="page-day"))

    (OUT / "assets" / "data" / "course.json").write_text(json.dumps(index))
    (OUT / "assets" / "data" / "cards.json").write_text(json.dumps(cards))
    for w in course["weeks"]:
        if not w["rest"]:
            search.append({"k": "week", "u": f"map.html#week-{w['week']}", "t": w["title"], "w": w["week"], "p": w["phase"],
                           "s": [x["title"] for x in w["days"]]})
    (OUT / "assets" / "data" / "search.json").write_text(json.dumps(search, separators=(",", ":")))

    for name, title, cls in [("index.html", "Learn Python free, from your first line to mastery", "page-home"),
                             ("map.html", "Course map", "page-map"),
                             ("playground.html", "Playground", "page-play"),
                             ("review.html", "Daily review", "page-review"),
                             ("account.html", "Your account", "page-account"),
                             ("settings.html", "Settings", "page-settings"),
                             ("privacy.html", "Privacy", "page-privacy"),
                             ("guide.html", "How this course works", "page-guide")]:
        body = template("pages/" + name).replace("{{hero_trace}}", json.dumps(hero_trace()) if name == "index.html" else "")
        if name == "guide.html":
            body = guide_fill(body, course)
        script = f'<script type="module" src="assets/js/pages/{name.replace(".html", ".js")}?v={VERSION}"></script>'
        if not (STATIC / "js" / "pages" / name.replace(".html", ".js")).exists():
            script = f'<script type="module" src="assets/js/pages/common.js?v={VERSION}"></script>'
        extra = ""
        if name == "index.html":
            extra = '<meta name="google-site-verification" content="SZzBTVkij9A9uLGTWAsfoe5_hCZ6Qm94xRuqL3BL9yU">\n<script type="application/ld+json">' + json.dumps({
                "@context": "https://schema.org", "@type": "Course", "name": "Python Atlas",
                "description": DEFAULT_DESC, "url": SITE_URL, "inLanguage": "en-GB", "isAccessibleForFree": True,
                "educationalLevel": "Beginner to advanced",
                "provider": {"@type": "Person", "name": "Peter Oluwafemi Adepoju", "url": SITE_URL},
            }) + "</script>"
        (OUT / name).write_text(page(title, body, depth=0, scripts=script, page_class=cls, extra_head=extra,
                                     path=name, desc=PAGE_DESC.get(name, ""),
                                     index=name not in ("account.html", "settings.html", "review.html")))
    (OUT / "offline.html").write_text(page("Offline", template("pages/offline.html"), depth=0, path="offline.html", index=False,
                                           scripts=f'<script type="module" src="assets/js/pages/common.js?v={VERSION}"></script>'))
    (OUT / "sw.js").write_text(template("sw.js").replace("{{version}}", VERSION))
    (OUT / "manifest.webmanifest").write_text(json.dumps({
        "name": "Python Atlas", "short_name": "Python Atlas", "id": "./",
        "description": "Learn Python free, from your first line to mastery. Lessons, exercises and Python that runs on your phone.",
        "start_url": "./index.html?source=app", "scope": "./", "display": "standalone", "orientation": "any",
        "background_color": "#16213a", "theme_color": "#16213a", "lang": "en-GB", "categories": ["education"],
        "icons": [
            {"src": icon("app-192.png"), "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": icon("app-512.png"), "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": icon("app-maskable-512.png"), "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "shortcuts": [
            {"name": "Course map", "url": "./map.html", "icons": [{"src": icon("app-192.png"), "sizes": "192x192"}]},
            {"name": "Daily review", "url": "./review.html", "icons": [{"src": icon("app-192.png"), "sizes": "192x192"}]},
            {"name": "Playground", "url": "./playground.html", "icons": [{"src": icon("app-192.png"), "sizes": "192x192"}]},
        ],
    }, indent=1))
    (OUT / "404.html").write_text(page("Page not found", template("pages/404.html"), depth=0, path="404.html", index=False,
                                       scripts=f'<script type="module" src="assets/js/pages/common.js?v={VERSION}"></script>'))
    today = __import__("datetime").date.today().isoformat()
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc></url>\n" for u in SITEMAP) + "</urlset>\n")
    print(f"Built {len(built)} lesson days, {len(cards)} review cards into {OUT}")


if __name__ == "__main__":
    build()
