# Writing lessons

Each lesson day is one Markdown file: `course/content/wNNN/dD.md` (week number with three digits, day 1–6). The day appears on the site and the course map as soon as its file exists. The schedule itself (titles of every week and day) lives in `course/curriculum.py`.

After editing, run:

```bash
python course/validate.py w001d1   # check one day (or leave the id off to check all)
python course/build.py
```

The validator runs every exercise's solution against its tests (it must pass), runs every starter (it must *not* pass), and runs every example (it must not crash unless marked `error=yes`).

## Front matter

```yaml
---
title: The day's title
intro: One or two sentences shown under the title.
goals:
  - By the end of today you can...
plan:
  - [30, "What this half hour is for"]
---
```

## Ordinary Markdown

Headings (`##` become the outline in the left rail), paragraphs, lists, tables, `inline code` and fenced code blocks all work as usual.

## Blocks

Blocks start with `:::name` and end with `:::` on its own line.

### Runnable example

```
:::example title="Optional title"
print("hello")
:::
```

Options: `error=yes` if it is meant to raise an error; `forever=yes` for an infinite loop shown on purpose (the validator skips it, and the site stops it after 10 seconds); `try=17,3` gives the validator input values to type. Every example gets Run, X-ray and Reset.

### Predict first

```
:::predict
print(7 // 2)
:::
```

The learner types their prediction before the Run button works; the output is compared with it.

### Exercise and bug hunt

```
:::exercise id=short_id points=10 title="Title"
The task, in Markdown.
@@starter
code the learner starts with
@@tests
def test_something():
    "what this check means, shown to the learner"
    expect_output("expected output", inputs=["typed", "values"], echo=True)
@@hint
First hint (Markdown). Repeat @@hint for more.
@@solution
model solution
:::
```

Use `:::bughunt` for code with a mistake to fix (the buggy code is the starter). Inside tests you can use:

| Helper | Meaning |
|---|---|
| `expect_output(text, inputs=[], echo=False)` | run the whole program and compare its output (trailing spaces ignored). With `echo=True` the typed input appears, as in the console. |
| `run(inputs=[], echo=False)` | run the program and return its output |
| `run_with({"old": "new"}, inputs=[])` | run with part of the code replaced, to test it on other values |
| `norm(text)` | strip trailing spaces and blank lines |
| `source` | the learner's code as text |
| `uses("print", "len")` | the code mentions these names |
| any variable or function the learner defined | e.g. `assert area == 28` |

Don't name a learner's variable `output`, `run`, `source` or any other helper above: the helper would hide it.

### Parsons puzzle

```
:::parsons id=pz1 title="Title"
Task.
@@lines
first line
    indented line
@@distractors
a line that doesn't belong
:::
```

### Quiz

YAML list. Types: `mc` (default; `answer` is the option index), `multi` (list of indexes), `text` (one or more accepted answers), `output` (the learner types the printed output; add `code`).

```
:::quiz id=quiz
- q: What does this print?
  type: output
  code: |
    print(2 ** 3)
  answer: "8"
  explain: Why.
:::
```

Wrap a question in single quotes if it contains `: ` or starts with a backtick and a quote. Every quiz question also becomes a review card.

### Interactive figure

```
:::widget name caption="What to notice."
{"json": "parameters"}
:::
```

Figures live in `course/static/js/widgets/NAME.js` and export `default function (element, params)`. Week 1 figures: `machine`, `bits`, `pipeline`, `anatomy`, `traceback`, `typesorter`, `typeinspect`, `operators`, `stepper`, `labels`, `namecheck`, `divmod`, `floatlab`, `roundlab`, `convert`, `strruler`, `escapes`, `printlab`, `fstringlab`, `inputflow`. Week 2 adds `compare`, `truthtable` and `branch` (an if/elif/else chain with a slider; set `"chain": false` for separate ifs). Week 3 adds `tracetable` (a hand-style trace table built row by row; params `code` and `inputs`) and `euclid`. Week 4 adds `rangeviz`, `nested` (params `rows`, `cols`, `triangle`) and `approx`. Week 5 adds `methodlab`, `textsearch` and `cipherwheel`. Weeks 6 and 7 add `callbind` (params `params`, `args`, `tries`) and `callgraph` (param `code`: draws a structure chart and marks stubs). Week 8 adds `listops` (params `start` and `ops`: runs list operations with real Python). Week 9 adds `gridviz` (rows, columns and neighbours of a grid), `sortkey` (params `items`, `key`, `keys`: shows the key worked out for each item) and `complab` (param `preset`: a comprehension beside the loop it stands for, item by item). Week 10 adds `dictops` (params `start` and `ops`, like `listops`), `nestview` (param `data`: a clickable tree of nested data showing the bracket path) and `setvenn` (params `a`, `b`, `labels`). Week 15 adds `calltree` (params `code`, `call`, `calls`: steps through every call and return, with the stack and the tree of calls). Week 16 adds `hanoi` (params `n`, `max`: the recursive Towers of Hanoi solution, move by move) and `floodfill` (params `grid` as a list of strings with `#` walls, `start` [row, col]: a recursive fill with its open calls). Week 17 adds `growth` (params `curves` from `1 log n nlogn n2 n3 2n`, `n`, `sizes`, `bigO`: step counts and rough times as n grows or doubles) and `loopcount` (params `presets` from `single step3 double square triangle inner_const inner_log seq two_ptr sqrt cube`, `sizes`: how often a loop body runs as n doubles). Week 18 adds `bsearch` (params `values` sorted, `target`: binary search with lo, mid and hi) and `sortviz` (params `algos` from `selection insertion bubble merge quick`, `values`, `presets`: bars, comparisons and swaps, with sorted, reversed and nearly sorted data). Week 19 adds `countsort` (params `values` whole numbers from 0 to `max`: tallying into boxes and reading them out). Week 21 adds `terminal` (params `files` a nested object of folders and file texts, `home`, `tasks` [{text, check}] where `check` is a JavaScript expression using `node(path)`, `cwd` and `home`: a safe practice shell with pwd, ls, cd, mkdir, touch, cat, echo with > and >>, cp, mv, rm, head, wc, history, tab completion and wildcards, plus a small Git in `minigit.js`: init, status, add, commit -m, log [--oneline], diff [--staged], restore, branch, switch [-c], merge with conflicts; task checks also get `git`, the repository state or null) and `pushpull` (no params: a local branch and its GitHub copy, with commit, push, a teammate's push, and pull). Week 23 adds `regexlab` (params `pattern`, `text`, `presets` a list of patterns to try, `flags` from `I` and `M`: live matches and groups, run with Python's `re`). Week 14 adds `edgegrid` (params `versions` {name: code defining f}, `cases`, `ref`, `title`), `pseudomap` (param `steps`: [plan line, Python lines] pairs) and `slidewindow` (params `values`, `k`). Week 11 adds `fileread` (params `text`, `name`: reads on a real file with a moving position), `tryflow` (params `code`, `tries`: which lines of a try statement ran) and `programs` for `traceback` (a `{name: code}` object of your own broken programs).

### Expression stepper (shortcut)

```
:::stepper caption="..."
2 + 3 * 4
(2 + 3) * 4
@@vars
{"x": 4}
:::
```

### Callouts

`:::key`, `:::tip`, `:::warn`, `:::mistake`, `:::think`, `:::note`, each with an optional `title="..."`.

## Style

British spelling. Plain words; one idea per paragraph. Every new idea gets something to run, X-ray or play with straight away. A normal day has 10–15 exercises, a puzzle, bug hunts, a 10-question quiz and a daily challenge; day 6 adds the Forge project and a 15-question weekly quiz.

## Files

Programs on a page can use files. A `:::files` block lists them, each starting with a line `=== name`:

```
:::files
=== marks.txt
Ada,93
Bo,41
:::
```

The block shows the files on the page (click to open) and gives every program on that page a fresh copy before each run, check or X-ray, in an empty working folder. An exercise can add its own files with an `@@files` section in the same format; they are shown under its prompt. After a run, the console lists the files in the folder, marking new, changed and deleted ones. Notebooks get a cell that creates the files.

Checks can use `read_file(name)` (the text, or `None`), `write_file(name, text)`, `files_now()` (the names, sorted) and `reset_files()` (back to the starting files). The learner's program has already run once when the checks start, so reset first if a check depends on the files being untouched; `run()` does not reset them.

## Exams

Add `exam=yes` to an exercise or bug hunt to leave its hints and solution off the page (the validator still checks the solution). The `examtimer` figure (params `minutes`, `key`) is a countdown that survives reloads; it never locks anything.


### Reserved names in checks

Checks run with these names provided by the grader, which hide any learner name that is the same: `run`, `output`, `source`, `ns`, `error`, `norm`, `uses`, `run_with`, `expect_output`, `read_file`, `write_file`, `files_now`, `reset_files`. Don't ask learners to define functions with these names. Learner code can't see the grader's `write_file`; give it a helper in the starter if it needs one.
