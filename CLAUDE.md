# Python Atlas: notes for Claude

A free, 104-week Python course by Peter Oluwafemi Adepoju, from zero to senior level, with in-browser coding (Pyodide).
Site: https://peter-adepoju.github.io/python-atlas/ (GitHub Pages, served from `docs/`).
Repo: https://github.com/peter-adepoju/python-atlas

## The standing task

Write the course week by week, to the standard of Week 1 and the recent weeks (look at `course/content/w028` and `w029` as models). After each week: validate, build, commit, push, and send Peter a short progress message. "Continue" means carry on with the next day.

**Status (10 November 2026):** Weeks 1 to 26, 28 to 39, 41 to 57, 59 to 70 and 72 to 81 are done (Weeks 27, 40, 58 and 71 are rest weeks, with no content). **Next: Week 82, "System design II"**: Distributed systems concepts, Observability, Reliability, Design interview practice, Design interview practice II, Forge. Then 83 Python for data (NumPy, pandas, matplotlib), 84 Python for machine learning (scikit-learn; PyTorch only "On your own computer"), 85 the Phase 6 exam week, 86 a rest week. Week 80 is the helpdesk project (modules helpdesk_domain, helpdesk_db, helpdesk_security, helpdesk_app on miniflask); Week 81 is System design I (all pure Python simulations). The validator needs numpy, pandas, matplotlib and scikit-learn installed locally (pip install them if missing); pandas locally may be 3.x while Pyodide has 2.x, so avoid checking dtype names or reprs that differ. In the browser, html.parser treats `<title>` content as raw text since Python 3.13, and shutil.copy2 doesn't keep modification times. GitHub push protection rejects realistic-looking sample keys: build sample secrets from pieces in tests. The offline Pyodide copy in /tmp/pyo can't load sqlite3 or pytest (the CDN is blocked in this sandbox), so those exercises are checked by the CPython validator only. Browser limits (Pyodide): no threads, no multiprocessing, no asyncio.run, no real network (no sockets, no urllib requests), no subprocess, no pip; pytest loads in the browser (checks calling against( or pytest_run( load it) but Hypothesis, coverage tools, Flask and FastAPI don't, so simulate and use "On your own computer" sections for the real tools. Pyodide packages a page needs are loaded from imports in the code, the checks and (since Week 75) the page's files. Don't check version-specific internals (the site runs 3.14, the validator 3.13, local Pyodide tests 3.12); HTTPStatus(422).phrase differs between versions, and core Pyodide has no hashlib.pbkdf2_hmac or scrypt. The full plan is in `course/curriculum.py`. Rest weeks have no folder.

Week numbers in cross-references: Phase 2 runs Week 14 (method) to 26 (exam): 15 to 16 recursion, 17 Big-O, 18 to 19 searching and sorting, 20 modules and stdlib, 21 shell, argparse and Git, 22 setting up, 23 text and data formats, 24 testing, 25 project (the `spend` expense tracker), 26 review and exam. Phase 3 starts at Week 28. Phase 4 (data structures and algorithms) starts at Week 41; Phase 5 (Advanced Python: generators, decorators, closures and `nonlocal`, context managers) comes after it, so lessons defer those topics to Phase 5. Check a day's title (`sed -n 2p course/content/wNNN/dD.md`) before writing "Week N" in a lesson.

## Style rules (Peter's, non-negotiable)

- No em dashes anywhere. British spelling.
- No specific job titles, nothing that reads as AI-generated, no commercial or "pro" mentions. The course stays free.
- Credit any source that's adapted.
- Feedback to Peter should be direct.

## Security

Never ask for or handle secret keys. The Supabase secret and service_role keys, the Gemini key and the Google client secret are never shared in chat. The publishable key and URL in `course/static/js/config.js` are public.

## Day format

Each day is `course/content/wNNN/dD.md`: YAML front matter (`title`, `intro`, `goals`, `plan` with minutes) then Markdown with `:::` blocks: `predict`, `example`, `key`, `think`, `widget`, `files`, `exercise`, `bughunt`, `parsons`, `quiz`. Day 6 of a normal week is a Forge (warm-up predictions, mixed review, a 50-point Forge, a 30-point bonus, a 15-question weekly quiz, a review checklist). Read `course/AUTHORING.md` for every block, widget and convention.

A typical teaching day: warm-up predict, 4 to 6 sections each ending in examples, a `key` summary, about 8 to 10 exercises (including 2 to 3 bug hunts, a Parsons puzzle and a "predict them" exercise), a 10-question quiz, a 25-point daily challenge, and "Before you go".

YAML gotchas: quote any goal or quiz question containing `: ` and any `q:` containing `\"`.

## Grading

Checks (`@@tests`) run in the learner's namespace. The grader provides these names, so learners must never define functions with them: `run`, `output` (a string), `source`, `ns`, `error`, `norm`, `uses`, `run_with`, `expect_output`, `read_file`, `write_file`, `files_now`, `reset_files`, `pytest_run`, `against`.

Only `test_` functions defined in the checks are graded. For testing exercises (Week 24 on), learners write pytest tests and the checks call `against(source, "module", {"correct": GOOD, **BROKEN})`: tests must pass on the correct version and fail on each broken one. Make sure every broken version is actually catchable (one in Week 26 turned out to be equivalent to the original).

Exam exercises take `exam=yes`, which hides hints and solutions on the page.

## Build, validate, deploy

```
timeout 600 python3 course/validate.py wNNNdD     # one day; runs every solution, starter and example
python3 course/validate.py                         # everything (about 30 minutes)
rm -rf course/static/py/__pycache__
python3 course/build.py
git add -A && git commit -m "..." && git pull --rebase -q && git push -q
```

Peter has given standing permission (1 November 2026) to merge finished work into `main` without asking: when a session works on a separate branch, open a pull request and merge it once the work is validated and pushed, so the live site updates.

The validator checks that every solution passes and every starter fails. Don't run two validations at once: they share `/tmp/atlas_work` and interfere.

Pyodide grading (`course/static/py/harness.py`, `course/static/js/py-worker.js`) can be tested in Node with an npm copy of `pyodide` (`npm install pyodide@0.27.7` in a scratch folder; load `harness.py` into the Pyodide file system, then call `harness.set_files("{}")` and `harness.grade_program(solution, [], 1, tests)`, which returns `results` with `ok` per check); pytest loads from the Pyodide CDN in the browser (the worker loads it automatically when checks call `against(` or `pytest_run(`).
