# Handoff: continuing Python Atlas

Read this whole file before writing anything. It replaces a long conversation in which the course was built week by week. Also read `CLAUDE.md` and `course/AUTHORING.md`, and then read two finished days in full (`course/content/w029/d2.md` and `course/content/w028/d6.md`), because matching their standard is the job.

## 1. The project in one paragraph

Python Atlas is a free, 104-week course by Peter Oluwafemi Adepoju that takes a complete beginner to senior level. It's a static site (GitHub Pages, from `docs/`) built by `course/build.py` from Markdown lessons in `course/content/wNNN/dD.md`. Every page runs Python in the browser with Pyodide: examples run, exercises are checked by hidden tests, and there are interactive widgets, quizzes, spaced review and optional accounts (Supabase). Six lesson days a week, about 3 hours each; Day 6 is a "Forge" day. The plan for every week is in `course/curriculum.py`.

- Repo: https://github.com/peter-adepoju/python-atlas (the old name `Intro-to-Python-Course` redirects; set `git remote set-url origin https://github.com/peter-adepoju/python-atlas.git` if you see "This repository moved").
- Site: https://peter-adepoju.github.io/python-atlas/

## 2. Where things stand (2 November 2026)

- **Done:** Weeks 1 to 26 (Phases 1 and 2, including the Week 25 project and the Week 26 exam week) and Weeks 28 to 35 (Phase 3: Objects I, Objects II, Inheritance, the Python data model, Modern classes, Type hints, Design principles, Design patterns I, Design patterns II and architecture, Robust programs, the `shelf` consolidation project and the Week 39 exam) and Weeks 41 to 49 (Phase 4 so far: arrays, linked lists, stacks and queues, hash tables, Trees I, Trees II, Heaps, Tries and string algorithms, and the first consolidation week). Weeks 13, 27 and 40 are rest weeks with no folder.
- **Next:** Week 50, "Graphs I": Graph representations, Breadth-first search, Depth-first search, Connected components, Topological sort, Forge. Already used without the word "graph": BFS on trees (Week 45 Day 4), word ladders with pattern buckets (Week 49 Day 3 P5), grid DFS with backtracking (Week 49 Day 4 B5), flood fill (Week 16), parent maps and cycle checks in the org chart (Week 45 Day 6). Build on these rather than repeating them. Credit Kahn (1962) for his topological sort; Tarjan (1972) if strongly connected components or DFS edge classification appear. Iterative DFS with explicit stacks (recursion limit); one-item lists stand in for nonlocal. Week 49 was consolidation: two review days, timed set 1 (with solutions), timed set 2 (exam=yes, debriefed on Day 6), and a mock interview day teaching a seven-step method (no company names or job titles).
- Then Phase 3 continues (see `curriculum.py`): Week 31 The Python data model (special methods tour, container protocols, rich comparisons, callable objects, `__slots__`), 32 Modern classes (dataclasses, Enums, NamedTuple, ABCs, Protocols), 33 Type hints, 34 Design principles, 35 Design patterns I, 36 Patterns II and architecture, 37 Robust programs, 38 Consolidation project (library system), then the Phase 3 exam week and a rest week. Compute the actual week numbers from `curriculum.py` (rest weeks count as weeks).
- Things promised in earlier lessons that later weeks must deliver: (Week 30 delivered `bool` as a subclass of `int`, `type(self)` and `cls(...)` for subclasses, and the name-mangling demonstration.) Week 30 also promised: Week 31 shows how composed classes support `d[key]`, `in` and `len()` (Week 30 Day 5's `LowerDict` used `get`/`set`/`has` methods instead); Week 32's abstract base classes make `NotImplementedError` hooks stricter, and Protocols formalise duck typing; Week 33's type hints check duck-typed arguments; Week 35 revisits the strategy pattern. Custom exceptions are now taught in Week 30 Days 1 and 2. Week 31 delivered `__len__`, `__iter__`, `__getitem__` and friends, rich comparisons and `total_ordering`, `__call__`, `__slots__`, and immutability with `__setattr__`/`object.__setattr__`; it promised Week 32 `collections.abc` base classes that fill in container methods, `@dataclass(slots=True)` and `frozen=True`; and iterators/generators (`yield`) and `nonlocal` in Phase 5. Week 32 delivered those Week 32 promises. The site loads Pyodide v314.0.7 (Python 3.14); the validator runs CPython 3.13; Week 32 was also smoke-tested in Pyodide 0.27.7 (Python 3.12) under Node with an npm copy in /tmp. One version difference found: a runtime-checkable Protocol treats a class attribute set to None as missing in 3.12 but present in 3.13. Still open: `__len__`, `__iter__` and rich comparisons (`__lt__` and friends) were deferred to Week 31; frozen dataclasses to Week 32; `__call__` to Week 31; the spend project's dictionaries were said to be "what a class does better" (the Phase 3 project can revisit this). Decorators are used (`@property`, `@classmethod`, `@cache`) but explained "in Phase 5".

## 3. Peter's rules (non-negotiable)

- **No em dashes**, anywhere: lessons, messages, commit messages. Use commas, colons, brackets or separate sentences.
- **British spelling** (colour, organise, behaviour, centre, licence as a noun, practise as a verb).
- Nothing that reads as AI-generated: no "Let's dive in", "In this lesson we will explore", "Great job!", no hype, no filler. Plain, warm, precise teacher's voice.
- No specific job titles ("data engineer", "backend developer"). Say "professional programmers", "real projects".
- No commercial or "pro" or paid-tier mentions. The course stays free.
- Credit any source adapted. Examples and data are original.
- Feedback to Peter is direct. Progress messages are short, specific, and honest about problems found and fixed.
- **Security:** never ask for or handle secret keys (Supabase secret or service_role keys, the Gemini key, the Google client secret). The publishable key and project URL in `course/static/js/config.js` are public and fine.

## 4. The quality bar

Every day must be something a beginner can learn from alone, and every check must be correct. Concretely:

**Structure of a normal day** (copy the shape of `w029/d2.md`):
1. Front matter: `title`; `intro` (3 to 5 sentences: what today is, why it matters, what you'll do; ties to previous days); 5 `goals` (each starting with a verb); `plan` as `[minutes, "Section"]` totalling about 180.
2. `## Warm-up` with a `:::predict` whose output reveals today's idea, followed by one short paragraph explaining it.
3. 4 to 5 teaching sections. Each explains one idea in plain prose, with tables where they help, and at least one runnable `:::example` or `:::predict`. Show the mistake as well as the right way. Use realistic, small, original scenarios (shops, libraries, football tables, recipes, trains, bank accounts, Nigerian and British place names mixed naturally).
4. A `:::key` summary (3 to 5 sentences that someone could revise from).
5. `## Practice`: about 8 to 10 items: 4 to 6 exercises of rising difficulty (10 to 15 points), 2 to 3 `:::bughunt`s (10 points each, a single realistic bug, prompt says the symptom), a `:::parsons` with exactly one trap line (`@@distractors`), and a "Predict them" exercise of `a = ___` answers.
6. `## Quiz`: 10 questions, each with an `explain`.
7. `## Daily challenge`: one 25-point exercise that combines the day's ideas with earlier ones, with a hint and full solution.
8. `## Before you go`: one practical suggestion, then one sentence previewing tomorrow.

**Forge day** (copy `w028/d6.md` or `w029/d6.md`): 5 warm-up predicts with links back to each day; 2 to 4 mixed-review exercises; a 50-point Forge with a clear specification written as prose and bullet lists before the exercise; a `:::think` reflection; a 30-point bonus; a 15-question `weekly` quiz; a "Week N review" checklist linking each day (`[Day 1](w030d1.html)`), ending by saying tomorrow is a rest day and naming next week's topic.

**Exercises:**
- Starters use `___` placeholders or a stub; a starter must **fail** the checks (the validator enforces this).
- Checks test behaviour thoroughly: ordinary cases, edge cases (empty, one item, ties, boundaries), errors raised (`try: ... assert False, "message"` / `except ValueError: pass`), and that operands or inputs aren't mutated. Each test function has a short docstring shown to the learner; assertion messages should tell the learner what's wrong.
- Write the solution, then **work every expected value out by running code**, not in your head. Many bugs during this project were wrong expected values or exercises whose broken versions couldn't be caught.
- For classes, checks reach the learner's class through `ns["ClassName"]`.
- Hints nudge without giving the code away; a hint may name the key function or pattern.
- Spec text must match the checks exactly (output format, rounding, ordering, tie rules). Ambiguity is a bug.

**Explanations:** honest and accurate. If something is a simplification, say so briefly. Cross-reference earlier weeks only after checking the week number (`sed -n 2p course/content/wNNN/dD.md`).

## 5. Authoring mechanics and pitfalls

- Read `course/AUTHORING.md` for every block type and widget (with its parameters). Don't invent widget parameters; when unsure, use an `:::example` instead.
- **YAML in front matter and quizzes:** quote any string containing `: ` (for example `- q: "What does if v: do?"`), and quote `q:` values containing `\"`. Quiz questions can have `type: output` with `code: |` (the validator runs the code), `type: text` with a list of accepted answers, or `options` with an `answer` index; `code` also works with `options`.
- **Names the grader provides** inside checks (learners must not define functions with these names): `run`, `output` (a string, not a function), `source`, `ns`, `error`, `norm`, `uses`, `run_with`, `expect_output(text)`, `read_file`, `write_file`, `files_now`, `reset_files`, `pytest_run(test_code, files=None)`, `against(test_code, module, versions)`.
- Only `test_` functions defined in the checks are graded (never the learner's own).
- Files: a page-level `:::files` block gives files to every exercise on the page; `@@files` on an exercise adds or overrides files for it. `reset_files()` restores them.
- **Testing exercises** (pytest, from Week 24): the learner writes tests; the checks do `results = against(source, "module", {"correct": GOOD, **BROKEN})`, then `write_file("module.py", GOOD)`, assert `results["correct"] == []` and that every broken version has at least one failure. Build broken versions with `GOOD.replace(...)` and **check each one really is catchable and really differs** (a "weights reversed" ISBN version once turned out to be mathematically equivalent to the original).
- Regex in tests: single backslashes inside `r"..."`.
- Exam exercises take `exam=yes` (hints and solutions hidden on the page, still validated).
- Inline code now keeps its spaces (CSS `white-space: pre-wrap`), so exact spacing in prompts is visible.
- Pyodide in the browser has a recursion limit of about 1000 and a 15-second grading timeout; keep big-input tests modest (lists of a few hundred thousand, recursion depth in the hundreds).
- `zoneinfo` works in the browser (the worker loads `tzdata`); `datetime.fromisoformat` accepts `Z`.

## 6. The routine for each day

1. Read the curriculum entry and the previous day's ending ("Before you go" previews today).
2. Write `course/content/wNNN/dD.md`.
3. `timeout 600 python3 course/validate.py wNNNdD` and fix every problem (the validator runs every example, solution and starter, and checks quiz YAML and code questions). Never run two validations at the same time: they share `/tmp/atlas_work` and cause false failures.
4. `rm -rf course/static/py/__pycache__ && python3 course/build.py`
5. `git add -A && git commit -m "Week N Day D: Title" && git pull --rebase -q && git push -q`
6. After each finished week, send Peter a short message: what each day covers (one line each), anything notable found or fixed, what's next. Occasionally run the full validation (`python3 course/validate.py`, about 30 minutes) and report the totals; the last full run was 1,413 exercises and 1,175 examples with no real problems.

Commit messages end with the attribution lines required by your environment, if any.

## Saving progress part-way through a lesson (3 November 2026)

Peter asked for lessons to be doable bit by bit across days. Everything a learner does on a lesson page is saved as they go (`course/static/js/progress.js`), on the device and, when signed in, to their account: solved exercises (`ex:`), code drafts (`code:`), quiz answers per question (`qa:<quiz>#<n>`, restored with their feedback; the first-try result still counts for scores and review cards), typed predictions (`guess:`), Parsons arrangements (`pzlines:`) and the last section read (`pos:<day>`). Signed-out progress now stays in `localStorage` between visits (it used to be session-only); the account page has "Forget progress on this device" for shared computers, and the privacy page says so. A lesson revisited part-way shows a "Welcome back" box with a button to continue at the first unsolved exercise or the last section read, and the bottom of every lesson has a "Save progress" button (saving is automatic; the button saves at once and says where it went).

## 7. Outstanding items for Peter (not for you to do)

- Run in Supabase: `grant select, insert, update, delete on table public.progress to authenticated;`
- Test the time zone examples on Week 23 Day 5 in the browser.
- Decide whether Week 24 Days 5 and 6 should keep using small classes before Phase 3 (they currently carry a note saying learners only use them).

## 8. Phase numbers

Phase 4 is "Data structures and algorithms" (Weeks 41 onwards); Phase 5 is "Advanced Python" (iterators and generators, decorators, closures and `nonlocal`, context managers, descriptors). Lessons that defer generators, decorators or `nonlocal` must say Phase 5. Several lessons wrongly said Phase 4 for these and were corrected on 1 November 2026; lessons deferring algorithms (Weeks 3, 5, 8) correctly say Phase 4.
