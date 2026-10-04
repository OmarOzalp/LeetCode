"""Convert JSON test data to call arguments and results back to JSON, and compare results."""

import ast
import copy
import json
import math
import re

from structures import (
    StructureError,
    build_graph,
    build_list,
    build_list_with_cycle,
    build_tree,
    find_tree_node,
    graph_to_adj,
    list_to_array,
    tree_to_array,
)


class DatasetError(Exception):
    """A problem's test data does not match its runner spec (a bug in the dataset)."""


class InputParseError(Exception):
    """A custom test input could not be parsed."""


def base_type(type_name):
    """Strip Optional[...] wrappers: 'Optional[TreeNode]' -> 'TreeNode'."""
    t = type_name.replace(" ", "")
    m = re.fullmatch(r"Optional\[(.*)\]", t)
    if m:
        t = m.group(1)
    t = re.sub(r"Optional\[(\w+)\]", r"\1", t)
    return t


def build_value(type_name, raw, extra=None):
    t = base_type(type_name)
    if t == "ListNode":
        if extra is not None:
            return build_list_with_cycle(raw, extra)
        return build_list(raw)
    if t == "List[ListNode]":
        return [build_list(x) for x in (raw or [])]
    if t == "TreeNode":
        return build_tree(raw)
    if t == "Node":
        return build_graph(raw)
    return copy.deepcopy(raw)


def prepare_args(params, inputs):
    """Returns (positional args, dict of built values by param name)."""
    built = {}
    for p in params:
        name = p["name"]
        if p.get("ref"):
            continue
        if name not in inputs:
            raise DatasetError("Missing input for parameter '{}'".format(name))
        extra = None
        if p.get("cycle_from"):
            extra = inputs.get(p["cycle_from"], -1)
        built[name] = build_value(p["type"], inputs[name], extra)
    for p in params:
        if p.get("ref"):
            name = p["name"]
            root = built.get(p["ref"])
            node = find_tree_node(root, inputs.get(name))
            if node is None:
                raise DatasetError("Value {!r} for '{}' was not found in '{}'".format(inputs.get(name), name, p["ref"]))
            built[name] = node
    args = [built[p["name"]] for p in params if p.get("call", True)]
    return args, built


def to_jsonable(value, depth=0):
    """Best-effort conversion of an arbitrary Python value to JSON-compatible data."""
    if depth > 200:
        return "<too deeply nested>"
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        if math.isnan(value):
            return "nan"
        if math.isinf(value):
            return "inf" if value > 0 else "-inf"
        return value
    if isinstance(value, (list, tuple)):
        return [to_jsonable(v, depth + 1) for v in value]
    if isinstance(value, (set, frozenset)):
        items = [to_jsonable(v, depth + 1) for v in value]
        try:
            return sorted(items)
        except TypeError:
            return sorted(items, key=lambda x: json.dumps(x, sort_keys=True))
    if isinstance(value, dict):
        return {str(k): to_jsonable(v, depth + 1) for k, v in value.items()}
    # Structures returned where plain data was expected.
    cls_name = type(value).__name__
    if cls_name == "ListNode" or (hasattr(value, "val") and hasattr(value, "next")):
        try:
            return list_to_array(value)
        except StructureError:
            return repr(value)
    if cls_name == "TreeNode" or (hasattr(value, "val") and hasattr(value, "left")):
        try:
            return tree_to_array(value)
        except StructureError:
            return repr(value)
    try:
        import numbers

        if isinstance(value, numbers.Integral):
            return int(value)
        if isinstance(value, numbers.Real):
            return float(value)
    except Exception:
        pass
    return "<{}: {}>".format(cls_name, repr(value)[:200])


def serialize_output(type_name, value):
    """Serialize a returned value according to the declared return type."""
    t = base_type(type_name)
    if t == "ListNode":
        if value is None:
            return []
        if not hasattr(value, "val"):
            return to_jsonable(value)
        return list_to_array(value)
    if t == "List[ListNode]":
        return [list_to_array(v) if v is not None else [] for v in (value or [])]
    if t == "TreeNode":
        if value is None:
            return []
        if not hasattr(value, "val"):
            return to_jsonable(value)
        return tree_to_array(value)
    if t == "TreeNodeVal":
        if value is None:
            return None
        if hasattr(value, "val"):
            return to_jsonable(value.val)
        return to_jsonable(value)
    if t == "Node":
        if value is None:
            return []
        if not hasattr(value, "neighbors"):
            return to_jsonable(value)
        return graph_to_adj(value)
    return to_jsonable(value)


# ---------------------------------------------------------------- comparison

def _canon(x):
    return json.dumps(x, sort_keys=True)


def _sorted_any(items):
    try:
        return sorted(items)
    except TypeError:
        return sorted(items, key=_canon)


def floats_close(a, b, tol=1e-5):
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= tol * max(1.0, abs(a), abs(b))
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(floats_close(x, y, tol) for x, y in zip(a, b))
    return a == b


def values_equal(a, b):
    """Equality that does not treat True == 1 or False == 0 as equal."""
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(values_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(values_equal(a[k], b[k]) for k in a)
    return a == b


def compare(mode, output, expected, checker=None, inputs=None):
    """Return (passed: bool, message: str | None)."""
    if mode == "custom":
        if checker is None:
            raise DatasetError("compare mode 'custom' requires a checker")
        res = checker(copy.deepcopy(inputs), output, expected)
        if isinstance(res, tuple):
            return bool(res[0]), (res[1] if len(res) > 1 else None)
        return bool(res), None
    if mode == "float":
        return floats_close(output, expected), None
    if mode == "unordered":
        if not isinstance(output, list):
            return False, "Expected a list (in any order)."
        if not isinstance(expected, list):
            return values_equal(output, expected), None
        return values_equal(_sorted_any(output), _sorted_any(expected)), None
    if mode == "unordered_nested":
        if not isinstance(output, list):
            return False, "Expected a list of lists (in any order)."

        def norm(lst):
            return _sorted_any([_sorted_any(x) if isinstance(x, list) else x for x in lst])

        if len(output) != len(expected):
            return False, None
        return values_equal(norm(output), norm(expected)), None
    return values_equal(output, expected), None


# ---------------------------------------------------------------- custom input parsing

def parse_literal(text, name):
    s = (text or "").strip()
    if s == "":
        raise InputParseError("No value given for `{}`.".format(name))
    try:
        return json.loads(s)
    except Exception:
        pass
    try:
        return to_jsonable(ast.literal_eval(s))
    except Exception:
        raise InputParseError(
            "Could not parse the value for `{}`: {}. Use Python or JSON literals, "
            "e.g. [1, 2, 3], \"abc\", True, None.".format(name, s[:80])
        )
