"""Runs a solution against test cases for the three runner kinds:
function (a method on a class), design (a sequence of operations on a class)
and codec (encode/decode round trip)."""

import copy
import linecache

from sandbox import (
    USER_FILENAME,
    TimeLimitExceeded,
    describe_exception,
    describe_syntax_error,
    make_namespace,
)
from structures import Node, StructureError, graph_nodes
from values import (
    DatasetError,
    InputParseError,
    build_value,
    compare,
    parse_literal,
    prepare_args,
    serialize_output,
    to_jsonable,
)


class LoadError(Exception):
    def __init__(self, info):
        super().__init__(info.get("message"))
        self.info = info


def load_solution(code, class_name, worker, filename=USER_FILENAME):
    """Compile and exec code; return (class, module_stdout). Raises LoadError."""
    # Register the source so tracebacks can show the offending line.
    linecache.cache[filename] = (len(code), None, code.splitlines(True), filename)
    try:
        compiled = compile(code, filename, "exec")
    except (SyntaxError, ValueError) as err:
        if isinstance(err, SyntaxError):
            info = describe_syntax_error(err)
        else:
            info = {"type": type(err).__name__, "message": str(err), "line": None, "column": None, "text": "", "hint": None}
        info["kind"] = "compile"
        raise LoadError(info)
    ns = make_namespace()
    run = worker.guarded_call(lambda: exec(compiled, ns), 5.0)
    if run["timed_out"]:
        raise LoadError({"kind": "runtime", "type": "TimeLimitExceeded", "message": "Your code took too long while being loaded (code outside the class runs at import time).", "line": None, "hint": None})
    if run["error"] is not None:
        info = describe_exception(run["error"], run["error"].__traceback__)
        info["kind"] = "runtime"
        info["message"] = "Error while loading your code: " + info["message"]
        raise LoadError(info)
    cls = ns.get(class_name)
    if cls is None or not isinstance(cls, type):
        raise LoadError({
            "kind": "structure",
            "type": "MissingClass",
            "message": "Could not find `class {}` in your code.".format(class_name),
            "line": None,
            "hint": "Keep the class name from the starter code.",
        })
    return cls, run["stdout"]


def method_names_of(cls):
    return tuple(name for name in dir(cls) if not name.startswith("__"))


def _load_checker(source):
    if not source:
        return None
    ns = make_namespace()
    exec(compile(source, "<checker>", "exec"), ns)
    return ns["check"]


class Judge:
    def __init__(self, runner, worker, time_limit_s=3.0):
        self.runner = runner
        self.worker = worker
        self.limit = time_limit_s
        self.checker = _load_checker(runner.get("checker"))

    # -------------------------------------------------- execute one test
    def execute(self, cls, inputs):
        """Run the solution class on one input. Returns dict with output (JSON),
        error (described), timed_out, elapsed_ms, stdout, note."""
        kind = self.runner["kind"]
        if kind == "function":
            return self._exec_function(cls, inputs)
        if kind == "design":
            return self._exec_design(cls, inputs)
        if kind == "codec":
            return self._exec_codec(cls, inputs)
        raise DatasetError("Unknown runner kind: {}".format(kind))

    def _exec_function(self, cls, inputs):
        r = self.runner
        args, built = prepare_args(r["params"], inputs)
        method_name = r["method"]
        if not callable(getattr(cls, method_name, None)):
            return _structure_error(
                "Your class `{}` has no method `{}`.".format(cls.__name__, method_name),
                "Keep the method name and signature from the starter code.",
            )
        input_node_ids = None
        if _base(r["returns"]) == "Node":
            input_node_ids = {id(n) for p in r["params"] if _base(p["type"]) == "Node" for n in graph_nodes(built[p["name"]])}

        def call():
            return getattr(cls(), method_name)(*args)

        run = self.worker.guarded_call(call, self.limit)
        res = _base_result(run, cls)
        if run["timed_out"] or run["error"] is not None:
            return res
        try:
            if r.get("mutates"):
                target = r["mutates"]
                ptype = next(p["type"] for p in r["params"] if p["name"] == target)
                res["output"] = serialize_output(ptype, built[target])
            else:
                res["output"] = serialize_output(r["returns"], run["result"])
                if run["result"] is None and r["returns"] not in ("None",):
                    res["returned_none"] = True
            if input_node_ids is not None and run["result"] is not None:
                shared = [n for n in graph_nodes(run["result"]) if id(n) in input_node_ids]
                if shared:
                    res["note"] = "Your result reuses {} node(s) from the original graph. A clone must consist of brand-new Node objects.".format(len(shared))
                    res["force_fail"] = True
        except StructureError as e:
            res["error"] = {"type": "InvalidResult", "message": str(e), "line": None, "traceback": "", "hint": None}
        return res

    def _exec_design(self, cls, inputs):
        ops = inputs.get("operations") or []
        arguments = inputs.get("arguments") or []
        if len(ops) != len(arguments):
            raise DatasetError("operations and arguments must have the same length")
        state = {"step": 0}

        def call():
            outputs = []
            obj = None
            for i, (op, a) in enumerate(zip(ops, arguments)):
                state["step"] = i
                a = copy.deepcopy(a)
                if i == 0:
                    obj = cls(*a)
                    outputs.append(None)
                else:
                    fn = getattr(obj, op, None)
                    if fn is None:
                        raise AttributeError("'{}' object has no method '{}'".format(cls.__name__, op))
                    outputs.append(to_jsonable(fn(*a)))
            return outputs

        run = self.worker.guarded_call(call, self.limit)
        res = _base_result(run, cls)
        if run["error"] is not None or run["timed_out"]:
            step = state["step"]
            if step < len(ops):
                where = "{}({})".format(ops[step], ", ".join(_short(x) for x in arguments[step]))
                res["note"] = "Stopped at operation #{}: {}".format(step + 1, where)
            return res
        res["output"] = run["result"]
        return res

    def _exec_codec(self, cls, inputs):
        r = self.runner
        value = build_value(r["type"], inputs[r["param"]])

        def call():
            encoded = getattr(cls(), r["encode"])(value)
            if not isinstance(encoded, str):
                raise TypeError("{}() must return a string, but it returned {}.".format(r["encode"], type(encoded).__name__))
            decoded = getattr(cls(), r["decode"])(encoded)
            return encoded, decoded

        for name in (r["encode"], r["decode"]):
            if not callable(getattr(cls, name, None)):
                return _structure_error("Your class `{}` has no method `{}`.".format(cls.__name__, name), "Keep the method names from the starter code.")
        run = self.worker.guarded_call(call, self.limit)
        res = _base_result(run, cls)
        if run["error"] is not None or run["timed_out"]:
            return res
        encoded, decoded = run["result"]
        try:
            res["output"] = serialize_output(r["type"], decoded)
        except StructureError as e:
            res["error"] = {"type": "InvalidResult", "message": str(e), "line": None, "traceback": "", "hint": None}
            return res
        preview = encoded if len(encoded) <= 300 else encoded[:300] + "... ({} chars)".format(len(encoded))
        res["note"] = "{}() produced: {}".format(r["encode"], _short(preview, 340))
        return res

    # -------------------------------------------------- compare
    def check(self, res, expected, inputs):
        if res.get("timed_out"):
            return "timeout", None
        if res.get("error") is not None:
            return "error", None
        if res.get("force_fail"):
            return "failed", res.get("note")
        mode = self.runner.get("compare", "exact")
        try:
            ok, msg = compare(mode, res.get("output"), expected, self.checker, inputs)
        except DatasetError:
            raise
        except Exception as e:  # checker crashed on a malformed output
            ok, msg = False, "Your output has an unexpected shape ({}).".format(e)
        if not ok and self.runner["kind"] == "design" and msg is None:
            msg = _design_mismatch(inputs, res.get("output"), expected)
        if not ok and res.get("returned_none") and expected is not None:
            msg = "Your function returned None. Did you forget to `return` the result?"
        return ("passed" if ok else "failed"), msg


def _base(t):
    t = t.replace(" ", "")
    if t.startswith("Optional[") and t.endswith("]"):
        t = t[len("Optional["):-1]
    return t


def _short(value, limit=60):
    import json

    try:
        s = json.dumps(value, ensure_ascii=False)
    except Exception:
        s = repr(value)
    return s if len(s) <= limit else s[: limit - 3] + "..."


def _base_result(run, cls):
    err = run["error"]
    described = None
    if err is not None:
        described = describe_exception(err, err.__traceback__, method_names_of(cls))
    return {
        "output": None,
        "error": described,
        "timed_out": run["timed_out"],
        "elapsed_ms": run["elapsed_ms"],
        "stdout": run["stdout"],
    }


def _structure_error(message, hint):
    return {
        "output": None,
        "error": {"type": "MissingMethod", "message": message, "line": None, "traceback": "", "hint": hint},
        "timed_out": False,
        "elapsed_ms": 0.0,
        "stdout": "",
    }


def _design_mismatch(inputs, output, expected):
    ops = inputs.get("operations") or []
    args = inputs.get("arguments") or []
    if not isinstance(output, list) or not isinstance(expected, list):
        return None
    for i, (o, e) in enumerate(zip(output, expected)):
        if o != e:
            call = "{}({})".format(ops[i] if i < len(ops) else "?", ", ".join(_short(x) for x in (args[i] if i < len(args) else [])))
            return "First mismatch at operation #{}: {} returned {} but expected {}.".format(i + 1, call, _short(o), _short(e))
    if len(output) != len(expected):
        return "Expected {} results but got {}.".format(len(expected), len(output))
    return None


def parse_custom_inputs(runner, raw):
    """Custom test inputs arrive as strings per param; parse them into JSON values."""
    kind = runner["kind"]
    if kind == "function":
        names = [p["name"] for p in runner["params"]]
    elif kind == "design":
        names = ["operations", "arguments"]
    else:
        names = [runner["param"]]
    parsed = {}
    for name in names:
        parsed[name] = parse_literal(raw.get(name, ""), name)
    if kind == "design":
        if not isinstance(parsed["operations"], list) or not isinstance(parsed["arguments"], list):
            raise InputParseError("`operations` and `arguments` must both be lists.")
        if len(parsed["operations"]) != len(parsed["arguments"]):
            raise InputParseError("`operations` and `arguments` must have the same length.")
        if any(not isinstance(a, list) for a in parsed["arguments"]):
            raise InputParseError("Each entry in `arguments` must be a list, e.g. [[], [\"apple\"], [\"app\"]].")
    return parsed


__all__ = ["Judge", "LoadError", "load_solution", "parse_custom_inputs", "TimeLimitExceeded", "Node"]
