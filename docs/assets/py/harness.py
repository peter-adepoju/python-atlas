"""In-browser Python harness: runs, traces and grades learner code.

Loaded once into Pyodide inside a Web Worker. The JavaScript side calls
`run_program`, `trace_program`, `grade_program`, `expr_steps` and
`tokens_of`, and receives plain dicts/lists (converted with to_js).
"""
import ast
import builtins
import io
import json
import os
import shutil
import tempfile
import keyword
import random
import sys

# matplotlib draws into memory (no window, no DOM); figures are sent to the page after a run.
os.environ["MPLBACKEND"] = "Agg"

sys.dont_write_bytecode = True   # keep the working folder free of __pycache__


class _RetryFinder:
    """Last on the import path: if no finder found a module, clear the folder caches and look
    once more. A file written a moment ago (in the same second, in the browser's file system)
    can otherwise be invisible to import."""

    @staticmethod
    def find_spec(name, path=None, target=None):
        import importlib
        import importlib.machinery
        importlib.invalidate_caches()
        return importlib.machinery.PathFinder.find_spec(name, path, target)


if not any(isinstance(f, type) and f.__name__ == "_RetryFinder" for f in sys.meta_path):
    sys.meta_path.append(_RetryFinder)
os.environ["PYTHONBREAKPOINT"] = "0"   # breakpoint() can't open a debugger prompt in the browser
import tokenize
import traceback
import types

FILENAME = "<your code>"
MAX_TRACE_STEPS = 600
MAX_OUTPUT = 200_000

_real_input = builtins.input


class NeedInput(BaseException):
    """Raised when the program asks for input we have not been given yet."""

    def __init__(self, prompt):
        self.prompt = prompt


class TooManySteps(BaseException):
    pass


class _Out(io.TextIOBase):
    """A stdout replacement that forwards text to a callback and keeps a copy."""

    def __init__(self, emit=None):
        self.buf = []
        self.size = 0
        self.emit = emit

    def writable(self):
        return True

    def write(self, s):
        if self.size < MAX_OUTPUT:
            self.buf.append(s)
            self.size += len(s)
            if self.emit is not None:
                self.emit(s)
        return len(s)

    def getvalue(self):
        return "".join(self.buf)


def _make_input(inputs, out, echo=True):
    queue = list(inputs)

    def fake_input(prompt=""):
        prompt = str(prompt)
        if not queue:
            raise NeedInput(prompt)
        value = str(queue.pop(0))
        # Echo like a real terminal: the prompt, then what the person typed.
        # Without echo, behave like a program whose input is piped in:
        # the prompt is printed but the typed text and its newline are not.
        out.write(prompt + value + "\n" if echo else prompt)
        return value

    return fake_input


# ---------------------------------------------------------------- errors

FRIENDLY = [
    ("NameError", "is not defined",
     "Python met a name it doesn't know. Check the spelling (capital letters count), "
     "make sure the variable was given a value on an earlier line, and that text is inside quotes."),
    ("SyntaxError", "unterminated string",
     "A string was opened with a quote but never closed. Every string needs a matching quote at the end."),
    ("SyntaxError", "was never closed",
     "An opening bracket ( [ or { has no matching closing bracket. Count them: every opener needs a closer."),
    ("SyntaxError", "unmatched",
     "There is a closing bracket with no opening bracket before it."),
    ("SyntaxError", "expected ':'",
     "Lines that start a block (if, else, while, for, def, class) must end with a colon :"),
    ("SyntaxError", "invalid syntax",
     "Python couldn't understand this line as written. Look for a missing operator, comma, quote or bracket "
     "near the place the arrow points to. Sometimes the real mistake is on the line before."),
    ("SyntaxError", "",
     "Python couldn't read your code, so none of it ran. The arrow points at where it got confused."),
    ("IndentationError", "",
     "The spaces at the start of a line don't match what Python expects. Lines in the same block need the "
     "same indentation; a line after a colon needs to be indented more."),
    ("TypeError", "can only concatenate str",
     "You tried to join text and a number with +. Convert the number first with str(...), or use an f-string."),
    ("TypeError", "unsupported operand",
     "This operator doesn't work for these two types of value. Check the type() of each side."),
    ("TypeError", "not callable",
     "You put ( ) after something that isn't a function. Often it's a variable that has the same name as a "
     "function, or a missing operator such as 2(3) instead of 2*(3)."),
    ("TypeError", "",
     "A value of the wrong type was used here. Check what type each value is with type()."),
    ("ValueError", "invalid literal for int()",
     "int() can only turn text that looks like a whole number into an int. Text such as '3.5' or 'five' "
     "can't be converted that way."),
    ("ValueError", "could not convert string to float",
     "float() could not read this text as a number."),
    ("ValueError", "",
     "The value had the right type but an unsuitable value for this operation."),
    ("ZeroDivisionError", "",
     "You divided by zero, which has no answer. Check the value of the divisor before dividing."),
    ("IndexError", "out of range",
     "You asked for a position that doesn't exist. Positions start at 0, so the last one is len(...) - 1."),
    ("KeyError", "",
     "That key isn't in the dictionary. Check its spelling, or use .get() to supply a default."),
    ("AttributeError", "",
     "This kind of value doesn't have the method or attribute you asked for. Check the spelling and the type."),
    ("RecursionError", "",
     "A function kept calling itself without stopping. Check that the base case is reachable."),
    ("EOFError", "",
     "The program asked for input but there was none to read."),
    ("ModuleNotFoundError", "",
     "That module isn't available here. Check the spelling; some packages only work on your own computer."),
]


def explain(exc_type, message):
    for name, needle, text in FRIENDLY:
        if exc_type == name and needle in message:
            return text
    return ""


def _error_info(exc, code):
    """Summarise an exception for the learner, hiding harness frames."""
    etype = type(exc).__name__
    msg = str(exc)
    line = None
    col = None
    if isinstance(exc, SyntaxError):
        if exc.filename == FILENAME:
            line, col = exc.lineno, exc.offset
        msg = exc.msg
    tb = exc.__traceback__
    frames = []
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == FILENAME:
            frames.append((tb.tb_lineno, tb.tb_frame.f_code.co_name))
        tb = tb.tb_next
    if frames and line is None:
        line = frames[-1][0]
    lines = code.splitlines()
    text = ["Traceback (most recent call last):"]
    for ln, fn in frames:
        where = "<module>" if fn == "<module>" else fn
        text.append(f'  File "{FILENAME}", line {ln}, in {where}')
        if 0 < ln <= len(lines):
            text.append("    " + lines[ln - 1].strip())
    if isinstance(exc, SyntaxError) and line:
        text.append(f'  File "{FILENAME}", line {line}')
        if 0 < line <= len(lines):
            src = lines[line - 1]
            text.append("    " + src.lstrip())
            if col:
                shift = len(src) - len(src.lstrip())
                text.append("    " + " " * max(col - 1 - shift, 0) + "^")
    text.append(f"{etype}: {msg}" if msg else etype)
    return {"type": etype, "message": msg, "line": line, "col": col,
            "traceback": "\n".join(text), "friendly": explain(etype, msg)}


# ---------------------------------------------------------------- files

# The files a lesson gives its programs. Every run starts in a fresh folder holding exactly these.
_FILES = {}
_WORK = os.path.join(tempfile.gettempdir(), "atlas_work")


def set_files(files_json):
    global _FILES
    _FILES = json.loads(files_json or "{}")


def _forget_work_modules():
    """Modules imported from the working folder are forgotten before each run, so a learner's
    edited helpers.py is imported fresh, and the folder is first on the import path."""
    import importlib
    for name, mod in list(sys.modules.items()):
        f = getattr(mod, "__file__", None) or ""
        if f and os.path.abspath(f).startswith(_WORK + os.sep):
            del sys.modules[name]
    if not sys.path or sys.path[0] != _WORK:
        while _WORK in sys.path:
            sys.path.remove(_WORK)
        sys.path.insert(0, _WORK)
    importlib.invalidate_caches()


def _reset_fs():
    _forget_work_modules()
    # Leave the folder before deleting it, so it's really removed and made afresh. In the browser's
    # file system, a folder that is the current directory can't be removed, and a file once
    # replaced with os.replace can then still be opened by name after it was deleted.
    os.chdir(os.path.dirname(_WORK))
    shutil.rmtree(_WORK, ignore_errors=True)
    os.makedirs(_WORK, exist_ok=True)
    for name, text in _FILES.items():
        path = os.path.join(_WORK, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    os.chdir(_WORK)


def _read_file(name):
    """The text of a file in the working folder, or None if there isn't one (for checks)."""
    try:
        with open(os.path.join(_WORK, name), encoding="utf-8", newline="") as f:
            return f.read()
    except FileNotFoundError:
        return None


def _write_file(name, text):
    path = os.path.join(_WORK, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def _snapshot_files():
    """Every file in the working folder after a run, with its text (shortened if long)."""
    out = []
    for name in _files_now():
        text = _read_file_safe(name)
        before = _FILES.get(name)
        state = "new" if before is None else ("same" if before == text else "changed")
        out.append({"name": name, "text": text if len(text) <= 4000 else text[:4000] + "\n[...]", "state": state})
    for name in sorted(_FILES):
        if name not in [f["name"] for f in out]:
            out.append({"name": name, "text": "", "state": "deleted"})
    return out


def _read_file_safe(name):
    try:
        return _read_file(name) or ""
    except UnicodeDecodeError:
        return "[not a text file]"


def _files_now():
    found = []
    for root, _dirs, names in os.walk(_WORK):
        for n in names:
            found.append(os.path.relpath(os.path.join(root, n), _WORK).replace(os.sep, "/"))
    return sorted(found)


# ---------------------------------------------------------------- running

def _fresh_namespace():
    return {"__name__": "__main__", "__builtins__": builtins}


def _reset_logging():
    """Put the logging module back as a fresh program would find it. Loggers live for the whole
    session, so without this a second run would keep the first run's handlers (writing to an old
    output) and basicConfig() would quietly do nothing."""
    logging = sys.modules.get("logging")
    if logging is None:
        return
    loggers = [logging.getLogger()] + [lg for lg in logging.Logger.manager.loggerDict.values()
                                       if isinstance(lg, logging.Logger)]
    for lg in loggers:
        for h in list(lg.handlers):
            lg.removeHandler(h)
            try:
                h.close()
            except Exception:  # noqa: BLE001 - a learner's handler may fail to close
                pass
        lg.filters.clear()
        lg.setLevel(logging.NOTSET)
        lg.propagate = True
        lg.disabled = False
    logging.getLogger().setLevel(logging.WARNING)
    logging.disable(logging.NOTSET)


def _close_figures():
    """Start every run with no matplotlib figures left over from the last one."""
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is not None:
        try:
            plt.close("all")
        except Exception:  # noqa: BLE001 - never let clean-up break a run
            pass


def _figures(limit=6):
    """The open matplotlib figures as base64 PNGs, so the page can show them after a run."""
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return []
    import base64
    import io
    images = []
    try:
        for num in plt.get_fignums()[:limit]:
            buf = io.BytesIO()
            plt.figure(num).savefig(buf, format="png", dpi=90, bbox_inches="tight")
            images.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    except Exception:  # noqa: BLE001 - a broken figure shouldn't hide the program's output
        pass
    _close_figures()
    return images


def _execute(code, inputs, seed, emit=None, namespace=None, echo=True):
    _close_figures()
    out = _Out(emit)
    ns = _fresh_namespace() if namespace is None else namespace
    old = sys.stdout, sys.stderr, builtins.input
    sys.stdout = sys.stderr = out
    _reset_logging()
    builtins.input = _make_input(inputs, out, echo)
    random.seed(seed)
    error = None
    need = None
    try:
        exec(compile(code, FILENAME, "exec"), ns)
    except NeedInput as e:
        need = e.prompt
    except SystemExit:
        pass
    except BaseException as e:  # noqa: BLE001 - we report every learner error
        error = _error_info(e, code)
    finally:
        sys.stdout, sys.stderr, builtins.input = old
    return out.getvalue(), error, need, ns


def run_program(code, inputs, seed, emit):
    _reset_fs()
    output, error, need, _ = _execute(code, list(inputs), seed, emit)
    try:
        os.chdir(_WORK)
        files = _snapshot_files()
    except OSError:
        files = []
    return {"output": output, "error": error, "need_input": need is not None,
            "prompt": need or "", "files": files, "figures": _figures()}


def check_syntax(code):
    try:
        compile(code, FILENAME, "exec")
        return None
    except SyntaxError as e:
        return _error_info(e, code)


# ---------------------------------------------------------------- grading

class _Grader:
    def __init__(self, code, inputs, seed):
        self.code = code
        self.seed = seed
        self.default_inputs = list(inputs)
        self.output, self.error, self.need, self.ns = _execute(code, inputs, seed)

    def run(self, inputs=(), echo=False):
        """Run the learner's whole program again with these inputs; return its output.

        By default the typed input is not echoed, so the result is exactly what print() wrote
        plus any input() prompts."""
        output, error, need, ns = _execute(self.code, list(inputs), self.seed, echo=echo)
        if need is not None:
            raise AssertionError("The program asked for more input than the test gave it "
                                 f"(it gave {len(inputs)} line(s)).")
        if error is not None:
            raise AssertionError(f"The program crashed: {error['type']}: {error['message']}")
        return output


def _run_with(g, subs, inputs=(), echo=False):
    """Run the learner's program with some text swapped (e.g. a different starting value)."""
    code = g.code
    for old, new in subs.items():
        if old not in code:
            raise AssertionError(f"Keep the line with {old} from the starter code: the checks change it to test your program.")
        code = code.replace(old, new, 1)
    output, error, need, ns = _execute(code, list(inputs), g.seed, echo=echo)
    if error is not None:
        raise AssertionError(f"With {', '.join(subs.values())} instead, the program crashed: {error['type']}: {error['message']}")
    return output


def norm(text):
    """Trim trailing spaces on every line and blank lines at the end."""
    return "\n".join(line.rstrip() for line in str(text).rstrip().splitlines())


def _show(text):
    text = str(text)
    return "\n".join("    " + line for line in text.splitlines()) if text.strip() else "    (nothing)"


def _make_expect(g):
    def expect_output(want, inputs=(), echo=False):
        """Run the whole program with these inputs and compare its output with `want`."""
        got = g.run(inputs, echo=echo)
        if norm(got) != norm(want):
            raise AssertionError("Expected this output:\n" + _show(norm(want)) +
                                 "\nYour program printed:\n" + _show(norm(got)))
    return expect_output


def uses(source, *names):
    """True if the learner's code mentions each of these words (used to require a technique)."""
    import re as _re
    return all(_re.search(r"\b" + _re.escape(n) + r"\b", source) for n in names)


_PYTEST_RUNS = [0]


def _pytest_run(test_code, files=None):
    """Run test code with real pytest in the working folder. Returns which tests passed and
    failed, and pytest's own output."""
    import contextlib
    import importlib
    import pytest
    for name, text in (files or {}).items():
        _write_file(name, text)
    _PYTEST_RUNS[0] += 1
    fname = f"test_yours_{_PYTEST_RUNS[0]}.py"
    _write_file(fname, test_code)
    _forget_work_modules()

    class _Collect:
        def __init__(self):
            self.passed, self.failed = [], []

        def pytest_runtest_logreport(self, report):
            name = report.nodeid.split("::")[-1]
            if report.failed and name not in self.failed:
                self.failed.append(name)
            elif report.when == "call" and report.passed:
                self.passed.append(name)

    c = _Collect()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        code = pytest.main([os.path.join(_WORK, fname), "-q", "-p", "no:cacheprovider",
                            "--import-mode=importlib", "-o", "console_output_style=classic"], plugins=[c])
    try:
        os.remove(os.path.join(_WORK, fname))
    except OSError:
        pass
    return {"exit": int(code), "passed": c.passed, "failed": c.failed, "output": buf.getvalue()}


def _against(test_code, module, versions):
    """Run the learner's tests against several versions of a module. Returns, for each version's
    label, the list of tests that failed (a good test suite passes the correct version and fails
    each buggy one)."""
    out = {}
    for label, text in versions.items():
        _write_file(module + ".py", text)
        r = _pytest_run(test_code)
        out[label] = r["failed"] if r["exit"] in (0, 1) else ["(the tests could not run)"]
    return out


def grade_program(code, inputs, seed, tests_code):
    _reset_fs()
    g = _Grader(code, inputs, seed)
    results = []
    if g.error is not None and g.error["type"] in ("SyntaxError", "IndentationError"):
        return {"output": g.output, "error": g.error, "results": [], "passed": 0, "total": 0}
    env = dict(g.ns)
    env.update({"output": g.output, "run": g.run, "norm": norm, "ns": g.ns,
                "error": g.error, "_code": code, "source": code,
                "expect_output": _make_expect(g), "uses": lambda *n: uses(code, *n),
                "run_with": lambda subs, inputs=(), echo=False: _run_with(g, subs, inputs, echo),
                "read_file": _read_file, "write_file": _write_file, "files_now": _files_now,
                "reset_files": _reset_fs, "pytest_run": _pytest_run, "against": _against})
    try:
        exec(compile(tests_code, "<tests>", "exec"), env)
    except BaseException as e:  # noqa: BLE001
        return {"output": g.output, "error": g.error, "passed": 0, "total": 1,
                "results": [{"name": "tests", "ok": False,
                             "message": f"The checker itself failed: {type(e).__name__}: {e}"}]}
    # Only the checks' own test_ functions are graded, never test functions the learner wrote.
    own = [n.name for n in ast.parse(tests_code).body if isinstance(n, ast.FunctionDef) and n.name.startswith("test_")]
    tests = [(k, env[k]) for k in own if callable(env.get(k))]
    for name, fn in tests:
        doc = (fn.__doc__ or name[5:].replace("_", " ")).strip()
        try:
            fn()
            results.append({"name": doc, "ok": True, "message": ""})
        except AssertionError as e:
            results.append({"name": doc, "ok": False, "message": str(e) or "Not quite yet."})
        except BaseException as e:  # noqa: BLE001
            results.append({"name": doc, "ok": False, "message": f"{type(e).__name__}: {e}"})
    passed = sum(r["ok"] for r in results)
    return {"output": g.output, "error": g.error, "results": results,
            "passed": passed, "total": len(results)}


# ---------------------------------------------------------------- tracing

_SIMPLE = (int, float, bool, type(None), complex)
_HIDE = {"__name__", "__builtins__", "__doc__", "__loader__", "__spec__",
         "__package__", "__annotations__", "__file__", "__cached__"}


class _Snapshotter:
    def __init__(self):
        self.labels = {}

    def label(self, obj):
        k = id(obj)
        if k not in self.labels:
            self.labels[k] = len(self.labels) + 1
        return self.labels[k]

    def ref(self, obj, heap, depth=0):
        oid = self.label(obj)
        if oid in heap:
            return oid
        entry = {"id": oid, "type": type(obj).__name__}
        heap[oid] = entry
        if isinstance(obj, _SIMPLE) or isinstance(obj, str):
            r = repr(obj)
            entry["kind"] = "value"
            entry["repr"] = r if len(r) <= 60 else r[:57] + "..."
        elif isinstance(obj, (list, tuple, set, frozenset)) and depth < 6:
            entry["kind"] = "seq"
            items = list(obj)[:40]
            entry["items"] = [self.ref(x, heap, depth + 1) for x in items]
            entry["more"] = max(len(obj) - 40, 0)
        elif isinstance(obj, dict) and depth < 6:
            entry["kind"] = "dict"
            pairs = list(obj.items())[:30]
            entry["pairs"] = [[self.ref(k, heap, depth + 1), self.ref(v, heap, depth + 1)] for k, v in pairs]
            entry["more"] = max(len(obj) - 30, 0)
        elif isinstance(obj, types.FunctionType):
            entry["kind"] = "func"
            try:
                import inspect
                entry["repr"] = f"{obj.__name__}{inspect.signature(obj)}"
            except (TypeError, ValueError):
                entry["repr"] = obj.__name__
        elif isinstance(obj, type):
            entry["kind"] = "class"
            entry["repr"] = obj.__name__
        elif hasattr(obj, "__dict__") and not isinstance(obj, types.ModuleType) and depth < 6:
            entry["kind"] = "object"
            attrs = [(k, v) for k, v in vars(obj).items() if not k.startswith("__")][:30]
            entry["pairs"] = [[k, self.ref(v, heap, depth + 1)] for k, v in attrs]
        else:
            entry["kind"] = "value"
            r = repr(obj)
            entry["repr"] = r if len(r) <= 60 else r[:57] + "..."
        return oid

    def variables(self, mapping, heap, module_level):
        out = []
        for k, v in mapping.items():
            if k in _HIDE or (module_level and k.startswith("__")):
                continue
            if isinstance(v, types.ModuleType):
                continue
            out.append([k, self.ref(v, heap)])
        return out


def trace_program(code, inputs, seed):
    _reset_fs()
    steps = []
    snap = _Snapshotter()
    out = _Out()
    old = sys.stdout, sys.stderr, builtins.input
    ns = _fresh_namespace()

    def record(frame, event, arg):
        heap = {}
        stack = []
        f = frame
        chain = []
        while f is not None:
            if f.f_code.co_filename == FILENAME:
                chain.append(f)
            f = f.f_back
        for fr in reversed(chain):
            module = fr.f_code.co_name == "<module>"
            name = "Global frame" if module else fr.f_code.co_name
            local_vars = fr.f_globals if module else fr.f_locals
            stack.append({"name": name, "vars": snap.variables(local_vars, heap, module)})
        step = {"line": frame.f_lineno, "event": event, "stack": stack,
                "heap": list(heap.values()), "stdout": out.getvalue()}
        if event == "return":
            step["ret"] = snap.ref(arg, heap)
            step["heap"] = list(heap.values())
        steps.append(step)
        if len(steps) >= MAX_TRACE_STEPS:
            raise TooManySteps()

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        if event in ("line", "return"):
            record(frame, event, arg)
        elif event == "call" and frame.f_code.co_name != "<module>":
            record(frame, "call", arg)
        return tracer

    sys.stdout = sys.stderr = out
    builtins.input = _make_input(list(inputs), out)
    random.seed(seed)
    error = None
    need = None
    truncated = False
    try:
        compiled = compile(code, FILENAME, "exec")
        sys.settrace(tracer)
        try:
            exec(compiled, ns)
        finally:
            sys.settrace(None)
    except TooManySteps:
        truncated = True
    except NeedInput as e:
        need = e.prompt
    except SystemExit:
        pass
    except BaseException as e:  # noqa: BLE001
        error = _error_info(e, code)
    finally:
        sys.stdout, sys.stderr, builtins.input = old
    # Final state after the last line ran.
    if not truncated and error is None and need is None:
        heap = {}
        steps.append({"line": None, "event": "end",
                      "stack": [{"name": "Global frame", "vars": snap.variables(ns, heap, True)}],
                      "heap": list(heap.values()), "stdout": out.getvalue()})
    return {"steps": steps, "error": error, "need_input": need is not None,
            "prompt": need or "", "truncated": truncated, "output": out.getvalue()}


# ---------------------------------------------------------------- trace table

def trace_table(code, inputs=None):
    """Rows for a hand-style trace table: one row per line run (module level only).

    Each row: the line number, its source, the value of every simple variable *after*
    that line ran, whatever it printed, and for while/if lines the value of the condition."""
    lines = code.splitlines()
    tests = {}
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.While, ast.If)):
                tests[node.lineno] = compile(ast.Expression(node.test), FILENAME, "eval")
    except SyntaxError as e:
        return {"rows": [], "names": [], "error": f"SyntaxError: {e.msg} (line {e.lineno})", "truncated": False}
    out = _Out()
    ns = _fresh_namespace()
    rows = []
    pending = [None]
    order = []

    def simple(v):
        return isinstance(v, (int, float, str, bool)) or v is None

    def snapshot():
        vals = {}
        for k, v in ns.items():
            if k.startswith("__") or not simple(v):
                continue
            if k not in order:
                order.append(k)
            vals[k] = repr(v)
        return vals

    def close_pending():
        p = pending[0]
        if p is not None:
            p["vars"] = snapshot()
            text = out.getvalue()
            p["out"] = text[p.pop("_mark"):]
            rows.append(p)
            pending[0] = None

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        if frame.f_code.co_name != "<module>":
            return None
        if event == "line":
            close_pending()
            ln = frame.f_lineno
            row = {"line": ln, "src": lines[ln - 1] if 0 < ln <= len(lines) else "", "cond": None, "_mark": len(out.getvalue())}
            if ln in tests:
                try:
                    row["cond"] = bool(eval(tests[ln], frame.f_globals))
                except Exception:  # noqa: BLE001
                    row["cond"] = None
            pending[0] = row
            if len(rows) > 300:
                raise TooManySteps()
        return tracer

    old = sys.stdout, sys.stderr, builtins.input
    sys.stdout = sys.stderr = out
    builtins.input = _make_input(list(inputs or []), out)
    error, truncated = None, False
    try:
        compiled = compile(code, FILENAME, "exec")
        sys.settrace(tracer)
        try:
            exec(compiled, ns)
        finally:
            sys.settrace(None)
        close_pending()
    except TooManySteps:
        truncated = True
    except NeedInput:
        error = "The program needs more input than the figure gave it."
    except BaseException as e:  # noqa: BLE001
        close_pending()
        info = _error_info(e, code)
        error = f"{info['type']}: {info['message']}"
    finally:
        sys.stdout, sys.stderr, builtins.input = old
    return {"rows": rows, "names": order, "error": error, "truncated": truncated}


# ---------------------------------------------------------------- expression stepper

_SAFE_CALLS = {"len", "abs", "int", "float", "str", "bool", "round", "min", "max",
               "type", "pow", "divmod", "ord", "chr", "sum", "sorted", "repr"}


def _evaluable(node):
    """A node we can reduce now: all its children are constants."""
    if isinstance(node, ast.BinOp):
        return isinstance(node.left, ast.Constant) and isinstance(node.right, ast.Constant)
    if isinstance(node, ast.UnaryOp):
        return isinstance(node.operand, ast.Constant)
    if isinstance(node, ast.Compare):
        return isinstance(node.left, ast.Constant) and all(isinstance(c, ast.Constant) for c in node.comparators)
    if isinstance(node, ast.Call):
        return (isinstance(node.func, ast.Name) and node.func.id in _SAFE_CALLS
                and all(isinstance(a, ast.Constant) for a in node.args) and not node.keywords)
    if isinstance(node, ast.Subscript):
        sl = node.slice
        ok_slice = isinstance(sl, ast.Constant) or (
            isinstance(sl, ast.Slice) and all(x is None or isinstance(x, ast.Constant)
                                              for x in (sl.lower, sl.upper, sl.step)))
        return isinstance(node.value, ast.Constant) and ok_slice
    if isinstance(node, ast.JoinedStr):
        return all(isinstance(v, ast.Constant) or
                   (isinstance(v, ast.FormattedValue) and isinstance(v.value, ast.Constant)
                    and (v.format_spec is None or all(isinstance(x, ast.Constant) for x in v.format_spec.values)))
                   for v in node.values)
    return False


def _next_target(node, env):
    """Find the next node to reduce, in Python's left-to-right order."""
    if isinstance(node, ast.Name):
        return node if node.id in env else None
    if isinstance(node, ast.BoolOp):
        first = node.values[0]
        if isinstance(first, ast.Constant):
            return node  # short-circuit decision is the next step
        return _next_target(first, env)
    if isinstance(node, ast.IfExp):
        if isinstance(node.test, ast.Constant):
            return node
        return _next_target(node.test, env)
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.Constant, ast.expr_context, ast.operator, ast.cmpop, ast.unaryop, ast.boolop)):
            continue
        t = _next_target(child, env)
        if t is not None:
            return t
    if _evaluable(node):
        return node
    return None


def _replace(tree, target, new):
    class R(ast.NodeTransformer):
        def generic_visit(self, n):
            if n is target:
                return new
            return super().generic_visit(n)

        def visit(self, n):
            if n is target:
                return new
            return super().visit(n)

    return R().visit(tree)


def _span(tree, target):
    full = ast.unparse(tree)
    marker = ast.Name(id="ZZQ_MARK", ctx=ast.Load())
    piece = ast.unparse(target)
    marked = ast.unparse(_replace(tree, target, marker))
    _replace(tree, marker, target)  # put it back
    pre = marked.split("ZZQ_MARK")[0]
    for cand in (piece, "(" + piece + ")"):
        if full.startswith(cand, len(pre)):
            return full, [len(pre), len(pre) + len(cand)]
    idx = full.find(piece)
    return full, ([idx, idx + len(piece)] if idx >= 0 else None)


def expr_steps(src, variables_json="{}"):
    env = json.loads(variables_json or "{}")
    try:
        tree = ast.parse(src.strip(), mode="eval")
    except SyntaxError as e:
        return {"error": f"SyntaxError: {e.msg}", "steps": []}
    steps = []
    safe = {k: getattr(builtins, k) for k in _SAFE_CALLS}

    class _Fold(ast.NodeTransformer):
        def visit_UnaryOp(self, n):
            self.generic_visit(n)
            if isinstance(n.op, (ast.USub, ast.UAdd)) and isinstance(n.operand, ast.Constant) \
                    and isinstance(n.operand.value, (int, float)) and not isinstance(n.operand.value, bool):
                v = n.operand.value
                return ast.Constant(-v if isinstance(n.op, ast.USub) else v)
            return n

    tree = ast.fix_missing_locations(_Fold().visit(tree))
    for _ in range(80):
        target = _next_target(tree.body if isinstance(tree, ast.Expression) else tree, env)
        if target is None:
            break
        text, span = _span(tree, target)
        note = ""
        if isinstance(target, ast.Name):
            value = env[target.id]
            note = f"look up the name {target.id}"
            new = ast.Constant(value)
        elif isinstance(target, ast.BoolOp):
            first = target.values[0].value
            is_and = isinstance(target.op, ast.And)
            rest = target.values[1:]
            if (is_and and not first) or (not is_and and first):
                new = ast.Constant(first)
                note = (f"{'and' if is_and else 'or'}: the left side is {first!r}, "
                        "so the right side is never evaluated (short-circuit)")
            else:
                new = rest[0] if len(rest) == 1 else ast.BoolOp(op=target.op, values=rest)
                note = (f"{'and' if is_and else 'or'}: the left side is {first!r}, "
                        "so the answer is whatever the right side is")
        elif isinstance(target, ast.IfExp):
            new = target.body if target.test.value else target.orelse
            note = f"the condition is {target.test.value!r}"
        else:
            piece = ast.unparse(target)
            try:
                value = eval(compile(ast.Expression(target), "<expr>", "eval"), {"__builtins__": safe})
            except Exception as e:  # noqa: BLE001
                steps.append({"text": text, "span": span, "note": f"{type(e).__name__}: {e}", "error": True})
                return {"steps": steps, "error": f"{type(e).__name__}: {e}"}
            note = f"{piece}  →  {value!r}"
            new = ast.Constant(value)
        steps.append({"text": text, "span": span, "note": note})
        if isinstance(tree, ast.Expression) and tree.body is target:
            tree.body = new
        else:
            tree = _replace(tree, target, new)
        ast.fix_missing_locations(tree)
    steps.append({"text": ast.unparse(tree), "span": None, "note": "done", "final": True})
    return {"steps": steps, "error": None}


# ---------------------------------------------------------------- tokens

def tokens_of(src):
    toks = []
    try:
        for t in tokenize.generate_tokens(io.StringIO(src).readline):
            kind = tokenize.tok_name[t.exact_type if t.type == tokenize.OP else t.type]
            if t.type in (tokenize.NL, tokenize.NEWLINE, tokenize.ENDMARKER, tokenize.INDENT, tokenize.DEDENT):
                continue
            if t.type == tokenize.NAME and keyword.iskeyword(t.string):
                kind = "KEYWORD"
            elif t.type == tokenize.OP:
                kind = "OP"
            toks.append({"text": t.string, "kind": kind, "line": t.start[0], "col": t.start[1]})
    except (tokenize.TokenError, IndentationError, SyntaxError) as e:
        return {"tokens": toks, "error": str(e)}
    return {"tokens": toks, "error": None}


def evaluate(src):
    """Evaluate one expression for small widgets (e.g. f-string playground)."""
    try:
        return {"value": repr(eval(src, {"__builtins__": builtins})), "str": None, "error": None}
    except Exception as e:  # noqa: BLE001
        return {"value": None, "error": f"{type(e).__name__}: {e}"}


def evaluate_str(src):
    try:
        return {"value": str(eval(src, {"__builtins__": builtins})), "error": None}
    except Exception as e:  # noqa: BLE001
        return {"value": None, "error": f"{type(e).__name__}: {e}"}


# ---------------------------------------------------------------- figure helpers

def pipeline(src):
    """What happens to a line of code: tokens, syntax tree, bytecode, output."""
    import dis
    result = {"tokens": tokens_of(src)["tokens"], "tree": None, "bytecode": None, "error": None}
    try:
        tree = ast.parse(src)
        result["tree"] = ast.dump(tree, indent=2, include_attributes=False)
        code = compile(src, FILENAME, "exec")
        buf = io.StringIO()
        dis.dis(code, file=buf)
        result["bytecode"] = buf.getvalue()
    except SyntaxError as e:
        result["error"] = f"SyntaxError: {e.msg} (line {e.lineno})"
    run = run_program(src, [], 1, None)
    result["output"] = run["output"]
    result["run_error"] = run["error"]["type"] + ": " + run["error"]["message"] if run["error"] else None
    return result


def float_info(text):
    """The exact value a float really stores, and how far it is from what was typed."""
    from decimal import Decimal, getcontext
    getcontext().prec = 80
    try:
        x = float(text)
    except ValueError as e:
        return {"error": str(e)}
    exact = Decimal(x)
    try:
        typed = Decimal(text.strip())
    except Exception:  # noqa: BLE001
        typed = exact
    frac = abs(x) - int(abs(x))
    bits = []
    for _ in range(60):
        frac *= 2
        bits.append("1" if frac >= 1 else "0")
        frac -= int(frac)
        if frac == 0:
            break
    m, e = x.hex(), None
    return {"repr": repr(x), "exact": format(exact, "f"), "error": None,
            "diff": format(exact - typed, "E") if exact != typed else "0",
            "binary_int": bin(int(abs(x)))[2:], "binary_frac": "".join(bits),
            "exact_equal": exact == typed, "hex": m}


def literal_info(src):
    """Evaluate a string literal safely and describe its characters."""
    try:
        value = ast.literal_eval(src)
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    if not isinstance(value, str):
        return {"error": "That is a " + type(value).__name__ + ", not a string."}
    chars = []
    for ch in value:
        name = {"\n": "newline", "\t": "tab", " ": "space", "\\": "backslash", "'": "quote", '"': "double quote"}.get(ch, "")
        chars.append({"ch": ch, "code": ord(ch), "name": name, "repr": repr(ch)[1:-1]})
    return {"error": None, "len": len(value), "chars": chars, "repr": repr(value), "printed": value}


def slice_info(text, start, stop, step):
    """Which positions s[start:stop:step] picks, in order (None means omitted)."""
    try:
        sl = slice(start, stop, step)
        idx = list(range(len(text)))[sl]
        return {"idx": idx, "value": repr(text[sl]), "error": None,
                "resolved": list(sl.indices(len(text)))}
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}", "idx": [], "value": ""}


def index_info(text, i):
    try:
        return {"value": repr(text[i]), "error": None}
    except Exception as e:  # noqa: BLE001
        return {"value": None, "error": f"{type(e).__name__}: {e}"}


def name_check(name):
    """Is this a valid, sensible variable name? Explain in plain words."""
    issues, ok = [], name.isidentifier() and not keyword.iskeyword(name)
    if not name:
        return {"ok": False, "issues": ["A name can't be empty."], "warnings": []}
    if name[0].isdigit():
        issues.append("Names can't start with a digit.")
    if " " in name:
        issues.append("Names can't contain spaces. Use an underscore: " + name.replace(" ", "_"))
    if "-" in name:
        issues.append("A hyphen means minus to Python. Use an underscore instead: " + name.replace("-", "_"))
    bad = sorted({c for c in name if not (c.isalnum() or c == "_") and c not in " -"})
    if bad:
        issues.append("These characters aren't allowed in names: " + " ".join(bad))
    if keyword.iskeyword(name):
        issues.append(f"'{name}' is a keyword: Python reserves it for its own grammar.")
    if not ok and not issues:
        issues.append("Python doesn't accept this as a name.")
    warnings = []
    if ok and hasattr(builtins, name):
        warnings.append(f"Allowed, but '{name}' is already the name of a built-in. Using it hides the built-in "
                        f"for the rest of your program, a classic source of confusing bugs.")
    if ok and any(c.isupper() for c in name) and not name.isupper():
        warnings.append("Allowed, but Python style is lower_case_with_underscores for variables.")
    if ok and len(name) == 1 and name in "lIO":
        warnings.append("Allowed, but l, I and O look like 1 and 0 in many fonts. Pick a clearer name.")
    if ok and name.isupper() and len(name) > 1:
        warnings.append("ALL_CAPS is the convention for constants: values meant never to change.")
    if ok and name.startswith("__") and name.endswith("__"):
        warnings.append("Names with double underscores on both sides are special to Python. Avoid inventing them.")
    return {"ok": ok, "issues": issues, "warnings": warnings}


def bind_call(params, args):
    """How a call's arguments are matched to a function's parameters (for the callbind figure)."""
    import inspect
    src = f"def f({params}):\n    pass\n"
    try:
        g = {}
        exec(compile(src, "<signature>", "exec"), g)
    except SyntaxError as e:
        return {"error": f"SyntaxError in the parameters: {e.msg}"}
    try:
        call_args, call_kwargs = eval(f"(lambda *a, **k: (a, k))({args})", {"__builtins__": builtins})
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__} in the call: {e}"}
    sig = inspect.signature(g["f"])
    try:
        ba = sig.bind(*call_args, **call_kwargs)
    except TypeError:
        try:
            g["f"](*call_args, **call_kwargs)
        except TypeError as e:
            return {"error": f"TypeError: {e}"}
        return {"error": "TypeError"}
    given = set(ba.arguments)
    ba.apply_defaults()
    rows = []
    positional = len(call_args)
    for i, (name, prm) in enumerate(sig.parameters.items()):
        v = ba.arguments.get(name)
        if name not in given:
            how = "nothing extra" if prm.kind in (prm.VAR_POSITIONAL, prm.VAR_KEYWORD) else "its default"
        elif prm.kind is prm.VAR_POSITIONAL:
            how = "the extra positional arguments"
        elif prm.kind is prm.VAR_KEYWORD:
            how = "the extra keyword arguments"
        elif name in call_kwargs:
            how = "by name"
        else:
            how = f"by position ({i + 1})" if i < positional else "by name"
        rows.append({"name": name, "value": repr(v), "how": how})
    return {"rows": rows, "error": None}


def call_graph(code):
    """Which of the program's own functions call which (for the structure-chart figure)."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"SyntaxError: {e.msg} (line {e.lineno})"}
    defs = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            defs[node.name] = node

    def calls_in(nodes):
        found = []
        for n in nodes:
            for sub in ast.walk(n):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id in defs:
                    if sub.func.id not in found:
                        found.append(sub.func.id)
        return found

    main_nodes = [n for n in tree.body if not isinstance(n, ast.FunctionDef)]
    edges = {"(main program)": calls_in(main_nodes)}
    docs = {}
    for name, node in defs.items():
        edges[name] = [c for c in calls_in(node.body) if c != name] + ([name] if name in calls_in(node.body) else [])
        d = ast.get_docstring(node)
        docs[name] = d.strip().splitlines()[0] if d else ""
    def placeholder(b):
        if isinstance(b, ast.Pass):
            return True
        if isinstance(b, ast.Expr) and isinstance(b.value, ast.Constant):
            return True
        return isinstance(b, ast.Return) and (b.value is None or isinstance(b.value, ast.Constant))
    stubs = [name for name, node in defs.items() if all(placeholder(b) for b in node.body)]
    return {"edges": edges, "docs": docs, "stubs": stubs, "unused": [n for n in defs if not any(n in v for k, v in edges.items() if k != n)], "error": None}


def list_op(list_src, op):
    """Run one operation on a list named x (for the list figure); report the list and the result."""
    try:
        x = eval(list_src, {"__builtins__": builtins})
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    before = [repr(v) for v in x] if isinstance(x, list) else None
    ns = {"x": x, "__builtins__": builtins}
    try:
        try:
            result = eval(op, ns)
            is_expr = True
        except SyntaxError:
            exec(op, ns)
            result = None
            is_expr = False
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}", "before": before}
    after = ns.get("x")
    return {"error": None, "before": before,
            "after": [repr(v) for v in after] if isinstance(after, list) else None,
            "after_repr": repr(after), "same": after is x,
            "result": repr(result), "is_expr": is_expr}


def comp_steps(expr, var, src, cond):
    """Run a list comprehension one item at a time (for the comprehension figure)."""
    import ast as _ast
    cond = (cond or "").strip()
    code = f"[{expr} for {var} in {src}" + (f" if {cond}" if cond else "") + "]"
    try:
        _ast.parse(code, mode="eval")
    except SyntaxError as e:
        return {"error": f"SyntaxError: {e.msg}", "code": code}
    ns = {"__builtins__": builtins}
    try:
        items = list(eval(src, ns))
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}", "code": code}
    if len(items) > 40:
        items = items[:40]
    rows, result = [], []
    try:
        for item in items:
            local = dict(ns)
            exec(f"{var} = __item", {**local, "__item": item}, local)
            shown = repr(item) if "," not in var else ", ".join(f"{k}={local[k]!r}" for k in [v.strip() for v in var.split(",")])
            keep = bool(eval(cond, local)) if cond else True
            val = eval(expr, local) if keep else None
            if keep:
                result.append(val)
            rows.append([shown, keep, repr(val) if keep else ""])
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}", "code": code, "rows": rows}
    loop = ["result = []", f"for {var} in {src}:"]
    if cond:
        loop += [f"    if {cond}:", f"        result.append({expr})"]
    else:
        loop += [f"    result.append({expr})"]
    return {"error": None, "code": "result = " + code, "loop": "\n".join(loop), "rows": rows, "result": repr(result)}


def dict_op(dict_src, op):
    """Run one operation on a dictionary named d (for the dictionary figure)."""
    try:
        d = eval(dict_src, {"__builtins__": builtins})
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    if not isinstance(d, dict):
        return {"error": "That isn't a dictionary."}
    pairs = lambda m: [[repr(k), repr(v)] for k, v in m.items()] if isinstance(m, dict) else None
    before = pairs(d)
    ns = {"d": d, "__builtins__": builtins}
    try:
        try:
            result, is_expr = eval(op, ns), True
        except SyntaxError:
            exec(op, ns)
            result, is_expr = None, False
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}", "before": before}
    after = ns.get("d")
    return {"error": None, "before": before, "after": pairs(after), "after_repr": repr(after),
            "same": after is d, "result": repr(result), "is_expr": is_expr}


def nest_tree(src):
    """Describe nested lists and dictionaries as a tree (for the nested-data figure)."""
    try:
        data = eval(src, {"__builtins__": builtins})
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    count = [0]
    q = lambda k: json.dumps(k) if isinstance(k, str) else repr(k)
    def walk(v, path):
        count[0] += 1
        if count[0] > 300:
            return {"kind": "more", "path": path, "repr": "..."}
        if isinstance(v, dict):
            return {"kind": "dict", "path": path, "n": len(v),
                    "kids": [[q(k), walk(x, f"{path}[{q(k)}]")] for k, x in v.items()]}
        if isinstance(v, (list, tuple)):
            return {"kind": type(v).__name__, "path": path, "n": len(v),
                    "kids": [[str(i), walk(x, f"{path}[{i}]")] for i, x in enumerate(v)]}
        r = repr(v)
        return {"kind": type(v).__name__, "path": path, "repr": r if len(r) < 60 else r[:57] + "..."}
    return {"error": None, "tree": walk(data, "data")}


def set_venn(a_src, b_src):
    """Split two sets into their three regions (for the Venn figure)."""
    try:
        a = eval(a_src, {"__builtins__": builtins})
        b = eval(b_src, {"__builtins__": builtins})
        a, b = set(a), set(b)
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    def show(s):
        try:
            items = sorted(s)
        except TypeError:
            items = sorted(s, key=repr)
        return [repr(x) for x in items]
    return {"error": None, "a": show(a), "b": show(b), "only_a": show(a - b), "both": show(a & b), "only_b": show(b - a)}


def file_steps(text, ops_json):
    """Open a real file holding `text` and run read operations one by one (for the file figure).

    Reports, after each operation, what it returned and where the file's position is."""
    ops = json.loads(ops_json)
    path = os.path.join(tempfile.gettempdir(), "atlas_figure.txt")
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    steps = []
    f = open(path, encoding="utf-8", newline="")
    try:
        for op in ops:
            try:
                if op.strip().startswith("for line in f"):
                    lines = []
                    for line in f:
                        lines.append(line)
                    result = lines
                    shown = "the loop gave: " + ", ".join(repr(x) for x in lines) if lines else "the loop gave nothing (already at the end)"
                else:
                    result = eval(op, {"f": f, "__builtins__": builtins})
                    shown = repr(result)
                err = None
            except Exception as e:  # noqa: BLE001
                shown, err = "", f"{type(e).__name__}: {e}"
            # f.tell() is an opaque number for text files; count characters read instead
            looped = op.strip().startswith("for line in f")
            pos = len(text) if (f.closed or looped) else _chars_at(text, f)
            steps.append({"op": op, "shown": shown, "error": err, "pos": pos, "closed": f.closed})
            if err:
                break
    finally:
        f.close()
    return {"steps": steps, "length": len(text)}


def _chars_at(text, f):
    data = text.encode("utf-8")
    return len(data[:f.tell()].decode("utf-8", errors="ignore"))


def edge_grid(versions_json, cases_json, ref):
    """Run several versions of a function f on several inputs (for the edge-case figure)."""
    versions = json.loads(versions_json)
    cases = json.loads(cases_json)
    def run_one(code, case):
        ns = {"__builtins__": builtins}
        try:
            exec(code, ns)
            args = eval(f"({case},)", {"__builtins__": builtins})
            return {"ok": True, "value": repr(ns["f"](*args))}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "value": f"{type(e).__name__}"}
    table = {name: [run_one(code, c) for c in cases] for name, code in versions.items()}
    want = table[ref]
    for name, cells in table.items():
        for cell, good in zip(cells, want):
            cell["right"] = cell == {"ok": good["ok"], "value": good["value"]} or (cell["ok"] and good["ok"] and cell["value"] == good["value"])
    return {"table": table, "cases": cases}


def call_tree(code, call, limit=400):
    """Record every call and return of the functions defined in `code` while running `call`
    (for the recursion figure). Events are in order; each call has an id and a parent."""
    ns = {"__builtins__": builtins, "__name__": "__main__"}
    try:
        exec(compile(code, FILENAME, "exec"), ns)
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}", "events": []}
    names = {k for k, v in ns.items() if isinstance(v, types.FunctionType)}
    events, stack, counter = [], [], [0]
    out = _Out()

    def show(v):
        r = repr(v)
        return r if len(r) <= 40 else r[:37] + "..."

    class TooMany(Exception):
        pass

    def tracer(frame, event, arg):
        if frame.f_code.co_name not in names or frame.f_code.co_filename != FILENAME:
            return tracer
        if event == "call":
            if len(events) >= limit:
                raise TooMany()
            counter[0] += 1
            n = frame.f_code.co_argcount
            args = ", ".join(show(frame.f_locals[v]) for v in frame.f_code.co_varnames[:n])
            events.append({"kind": "call", "id": counter[0], "parent": stack[-1] if stack else 0,
                           "label": f"{frame.f_code.co_name}({args})", "depth": len(stack)})
            stack.append(counter[0])
        elif event == "return":
            if stack:
                cid = stack.pop()
                events.append({"kind": "return", "id": cid, "value": show(arg), "depth": len(stack)})
        return tracer

    old_out = sys.stdout
    sys.stdout = out
    error = None
    sys.settrace(tracer)
    try:
        result = eval(call, ns)
    except TooMany:
        if not any(e["kind"] == "return" for e in events):
            error = f"{limit} calls and not one has returned: there's no base case, or the calls never reach it."
        else:
            error = f"Stopped after {limit} steps: the tree is too big to show."
        result = None
    except RecursionError:
        error = "RecursionError: maximum recursion depth exceeded. Is there a base case, and does every call get closer to it?"
        result = None
    except Exception as e:  # noqa: BLE001
        error = f"{type(e).__name__}: {e}"
        result = None
    finally:
        sys.settrace(None)
        sys.stdout = old_out
    return {"error": error, "events": events, "result": show(result), "output": out.getvalue()}


def call(fn, args_json):
    return globals()[fn](*json.loads(args_json))
