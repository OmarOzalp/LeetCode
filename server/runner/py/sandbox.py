"""Execution helpers: a worker thread with a large stack, per-call time limits,
stdout capture and human-friendly error descriptions."""

import builtins
import ctypes
import io
import json
import os
import re
import sys
import threading
import time
import traceback

USER_FILENAME = "solution.py"
RECORD_PREFIX = "\x1e"

_real_stdout = sys.stdout
_emit_lock = threading.Lock()


def emit(record):
    line = RECORD_PREFIX + json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n"
    with _emit_lock:
        _real_stdout.write(line)
        _real_stdout.flush()


class TimeLimitExceeded(BaseException):
    """Injected asynchronously into the worker thread when a call runs too long.
    Derives from BaseException so `except Exception` in user code does not swallow it."""


# ---------------------------------------------------------------- stdout capture

class CappedWriter(io.TextIOBase):
    def __init__(self, limit=16000):
        self.parts = []
        self.size = 0
        self.limit = limit
        self.truncated = False

    def writable(self):
        return True

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        if self.size < self.limit:
            room = self.limit - self.size
            self.parts.append(s[:room])
            if len(s) > room:
                self.truncated = True
        else:
            self.truncated = True
        self.size += len(s)
        return len(s)

    def getvalue(self):
        text = "".join(self.parts)
        if self.truncated:
            text += "\n... (output truncated)"
        return text


# ---------------------------------------------------------------- namespace for user code

def make_namespace():
    import structures

    ns = {"__name__": "solution", "__builtins__": builtins}
    exec(
        "from typing import *\n"
        "import collections, heapq, math, bisect, itertools, functools, string, re, random, operator\n"
        "from collections import deque, defaultdict, Counter, OrderedDict\n"
        "from functools import lru_cache, reduce\n"
        "from heapq import heappush, heappop, heapify\n"
        "from math import inf\n"
        "try:\n    from functools import cache\nexcept ImportError:\n    pass\n",
        ns,
    )
    ns["ListNode"] = structures.ListNode
    ns["TreeNode"] = structures.TreeNode
    ns["Node"] = structures.Node
    return ns


# ---------------------------------------------------------------- errors

def describe_syntax_error(err):
    lineno = getattr(err, "lineno", None)
    offset = getattr(err, "offset", None)
    text = (getattr(err, "text", None) or "").rstrip("\n")
    kind = type(err).__name__
    msg = getattr(err, "msg", str(err))
    hint = None
    if kind in ("IndentationError", "TabError"):
        hint = "Python uses indentation to define blocks. Make sure every block is indented consistently (4 spaces is standard) and do not mix tabs and spaces."
    elif "expected ':'" in msg:
        hint = "Statements like def, if, for, while and class must end with a colon."
    elif "was never closed" in msg or "unexpected EOF" in msg:
        hint = "A bracket or parenthesis is not closed. Check the line shown and the ones above it."
    elif "invalid syntax" in msg:
        hint = "Python could not understand this line. Look for a missing operator, comma, colon or bracket."
    return {
        "type": kind,
        "message": msg,
        "line": lineno,
        "column": offset,
        "text": text,
        "hint": hint,
    }


def _friendly_hint(exc, method_names=()):
    name = type(exc).__name__
    msg = str(exc)
    if isinstance(exc, RecursionError):
        return "Maximum recursion depth exceeded. Your recursion probably never reaches its base case, or a base case is missing for an empty/leaf input."
    if isinstance(exc, MemoryError):
        return "Ran out of memory. Look for data structures that grow without bound (e.g. a loop that keeps appending)."
    if isinstance(exc, IndexError):
        return "You accessed an index outside the bounds of a list or string. Check loop ranges and off-by-one errors, and handle empty inputs."
    if isinstance(exc, KeyError):
        return "A dictionary lookup used a key that does not exist. Use d.get(key, default), check `key in d` first, or use a defaultdict."
    if isinstance(exc, UnboundLocalError):
        return "You assign to this variable somewhere in the function, so Python treats it as local everywhere in it. Initialize it first, or use `nonlocal` inside a nested function."
    if isinstance(exc, NameError):
        m = re.search(r"name '(\w+)' is not defined", msg)
        if m and m.group(1) in method_names:
            return "`{0}` is a method of the class. Call it as self.{0}(...).".format(m.group(1))
        return "A name is used before it is defined. Check spelling and scope; inside a class call other methods with self.method()."
    if isinstance(exc, AttributeError) and "'NoneType' object has no attribute" in msg:
        attr = re.search(r"has no attribute '(\w+)'", msg)
        return "You accessed `.{}` on None. Guard against missing nodes (e.g. `if node:` or `while curr:`) before using their attributes.".format(
            attr.group(1) if attr else "attr"
        )
    if isinstance(exc, TypeError) and "NoneType" in msg:
        return "Something is None where a value was expected. A common cause is a helper function that forgets to `return`."
    if isinstance(exc, TypeError) and "missing" in msg and "positional argument" in msg:
        return "A function was called with too few arguments. Methods receive `self` automatically; helper calls need every argument."
    if isinstance(exc, TypeError) and "unhashable type" in msg:
        return "Lists (and dicts/sets) cannot be dict keys or set members. Convert to a tuple first, e.g. tuple(lst)."
    if isinstance(exc, ZeroDivisionError):
        return "Division or modulo by zero. Handle the zero/empty case before dividing."
    if isinstance(exc, ValueError) and ("arg is an empty" in msg or "iterable argument is empty" in msg):
        return "min()/max() was called on an empty sequence. Handle the empty case first or pass default=..."
    if name == "StructureError":
        return None
    return None


def describe_exception(exc, tb, method_names=()):
    frames = traceback.extract_tb(tb)
    user_frames = [f for f in frames if f.filename == USER_FILENAME]
    line = user_frames[-1].lineno if user_frames else None
    shown = user_frames[-6:]
    tb_lines = []
    if len(user_frames) > len(shown):
        tb_lines.append("  ... {} earlier frames omitted".format(len(user_frames) - len(shown)))
    for f in shown:
        tb_lines.append("  Line {}, in {}".format(f.lineno, f.name))
        if f.line:
            tb_lines.append("    " + f.line.strip())
    message = str(exc)
    if isinstance(exc, RecursionError):
        message = "maximum recursion depth exceeded"
    elif isinstance(exc, (SystemExit, KeyboardInterrupt)):
        message = "Your code tried to exit the interpreter (exit()/sys.exit())."
    return {
        "type": type(exc).__name__,
        "message": message[:2000],
        "line": line,
        "traceback": "\n".join(tb_lines),
        "hint": _friendly_hint(exc, method_names),
    }


# ---------------------------------------------------------------- worker / watchdog

class Worker:
    """Runs a job function in a thread with a big stack while the main thread
    enforces per-call deadlines registered through `guarded_call`."""

    def __init__(self):
        self.lock = threading.Lock()
        self.deadline = None
        self.hard_deadline = None
        self.injected_at = None
        self.thread = None
        self.on_hard_timeout = None
        self.error = None

    def guarded_call(self, fn, limit_s, capture=True):
        """Call fn() with a time limit. Returns dict(result, error, timed_out, elapsed_ms, stdout)."""
        out = CappedWriter() if capture else None
        old_stdout = sys.stdout
        result = None
        error = None
        timed_out = False
        elapsed = 0.0
        if capture:
            sys.stdout = out
        try:
            with self.lock:
                now = time.perf_counter()
                self.deadline = now + limit_s
                self.hard_deadline = now + limit_s + 2.5
                self.injected_at = None
            t0 = time.perf_counter()
            try:
                result = fn()
            finally:
                elapsed = time.perf_counter() - t0
                with self.lock:
                    self.deadline = None
                    self.hard_deadline = None
            # Give any exception injected right at the end a chance to surface here.
            for _ in range(5):
                pass
        except TimeLimitExceeded:
            with self.lock:
                self.deadline = None
                self.hard_deadline = None
            timed_out = True
            result = None
        except BaseException as exc:  # noqa: BLE001 - user code may raise anything
            error = exc
        finally:
            if capture:
                sys.stdout = old_stdout
        return {
            "result": result,
            "error": error,
            "timed_out": timed_out,
            "elapsed_ms": elapsed * 1000.0,
            "stdout": out.getvalue() if out else "",
        }

    def _inject(self):
        tid = self.thread.ident
        if tid is None:
            return
        ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_ulong(tid), ctypes.py_object(TimeLimitExceeded))

    def run(self, job, on_hard_timeout):
        """Run job() in the worker thread; block until done. on_hard_timeout() is
        called (then the process exits) if user code ignores the time limit."""
        for size in (512 * 1024 * 1024, 256 * 1024 * 1024, 64 * 1024 * 1024):
            try:
                threading.stack_size(size)
                break
            except (ValueError, RuntimeError):
                continue

        def target():
            try:
                job()
            except BaseException as exc:  # noqa: BLE001
                self.error = exc

        self.thread = threading.Thread(target=target, daemon=True)
        try:
            self.thread.start()
        except RuntimeError:
            threading.stack_size(0)
            self.thread = threading.Thread(target=target, daemon=True)
            self.thread.start()
        while self.thread.is_alive():
            self.thread.join(0.01)
            now = time.perf_counter()
            with self.lock:
                deadline, hard = self.deadline, self.hard_deadline
                if deadline is not None and now > deadline:
                    if self.injected_at is None or now - self.injected_at > 0.25:
                        self.injected_at = now
                        self._inject()
                if hard is not None and now > hard:
                    on_hard_timeout()
                    sys.stdout = _real_stdout
                    _real_stdout.flush()
                    os._exit(0)
        if self.error is not None:
            raise self.error


def set_resource_limits():
    """Best-effort memory cap (Linux only; ignored elsewhere)."""
    if not sys.platform.startswith("linux"):
        return
    try:
        import resource

        limit = 3 * 1024 * 1024 * 1024
        soft, hard = resource.getrlimit(resource.RLIMIT_AS)
        if hard == resource.RLIM_INFINITY or hard > limit:
            resource.setrlimit(resource.RLIMIT_AS, (limit, hard))
    except Exception:
        pass
