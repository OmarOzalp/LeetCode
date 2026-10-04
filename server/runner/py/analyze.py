"""Lightweight static inspection of a Python solution.

This is deliberately heuristic: it extracts structural features (loop nesting,
data structures, recursion, hidden linear-time operations) that the app uses to
describe a solution and to match it against the known approaches for a problem.
It never executes the code."""

import ast

from sandbox import emit

HASH_MAP_CALLS = {"dict", "defaultdict", "Counter", "OrderedDict"}
SET_CALLS = {"set", "frozenset"}
LINEAR_BUILTINS = {"sum", "min", "max", "sorted", "any", "all", "list", "reversed", "set", "dict", "tuple", "Counter"}
LOOP_NODES = (ast.For, ast.While, ast.AsyncFor)
COMP_NODES = (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)


def _call_name(node):
    f = node.func
    if isinstance(f, ast.Name):
        return f.id
    if isinstance(f, ast.Attribute):
        return f.attr
    return None


def _attr_owner(node):
    f = node.func
    if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name):
        return f.value.id
    return None


class FunctionInfo:
    def __init__(self, node, qualname):
        self.node = node
        self.name = node.name
        self.qualname = qualname
        self.max_depth = 0
        self.top_level_loops = 0
        self.recursive_calls = 0


class Analyzer(ast.NodeVisitor):
    def __init__(self, method_name):
        self.method_name = method_name
        self.tags = set()
        self.costly = []
        self.functions = []
        self.func_stack = []
        self.depth = 0
        self.max_depth = 0
        self.loop_count = 0
        self.memo = False
        self.list_names = set()
        self.append_names = set()
        self.pop_names = set()
        self.popleft_like = False
        self.table_2d = False
        self.table_1d = False
        self.has_mid = False
        self.has_pointer_loop = False
        self.string_concat_in_loop = False
        self.lines = 0

    # ---------------------------------------------- scopes
    def visit_FunctionDef(self, node):
        qual = node.name if not self.func_stack else self.func_stack[-1].qualname + "." + node.name
        info = FunctionInfo(node, qual)
        for dec in node.decorator_list:
            name = dec.id if isinstance(dec, ast.Name) else dec.attr if isinstance(dec, ast.Attribute) else None
            if isinstance(dec, ast.Call):
                name = _call_name(dec)
            if name in ("lru_cache", "cache"):
                self.memo = True
                self.tags.add("memoization")
        self.functions.append(info)
        self.func_stack.append(info)
        saved = self.depth
        self.depth = 0
        self.generic_visit(node)
        self.depth = saved
        self.func_stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_Lambda(self, node):
        self.generic_visit(node)

    # ---------------------------------------------- loops
    def _enter_loop(self, node, is_comp=False):
        self.depth += 1
        self.loop_count += 1
        cur = self.func_stack[-1] if self.func_stack else None
        if cur is not None:
            cur.max_depth = max(cur.max_depth, self.depth)
            if self.depth == 1 and not is_comp:
                cur.top_level_loops += 1
        self.max_depth = max(self.max_depth, self.depth)

    def visit_For(self, node):
        self.visit(node.iter)
        self._enter_loop(node)
        for stmt in node.body + node.orelse:
            self.visit(stmt)
        self.visit(node.target)
        self.depth -= 1

    visit_AsyncFor = visit_For

    def visit_While(self, node):
        test = node.test
        if isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.ops[0], (ast.Lt, ast.LtE)):
            if isinstance(test.left, ast.Name) and isinstance(test.comparators[0], ast.Name):
                self.has_pointer_loop = True
        self.visit(test)
        self._enter_loop(node)
        for stmt in node.body + node.orelse:
            self.visit(stmt)
        self.depth -= 1

    def _visit_comp(self, node):
        gens = node.generators
        for g in gens:
            self.visit(g.iter)
            self._enter_loop(node, is_comp=True)
        for g in gens:
            for cond in g.ifs:
                self.visit(cond)
        if isinstance(node, ast.DictComp):
            self.visit(node.key)
            self.visit(node.value)
            self.tags.add("hash_map")
        else:
            self.visit(node.elt)
            if isinstance(node, ast.SetComp):
                self.tags.add("hash_set")
            if isinstance(node, ast.ListComp) and isinstance(node.elt, (ast.List, ast.ListComp, ast.BinOp)):
                self.table_2d = True
        self.depth -= len(gens)

    visit_ListComp = _visit_comp
    visit_SetComp = _visit_comp
    visit_DictComp = _visit_comp
    visit_GeneratorExp = _visit_comp

    # ---------------------------------------------- expressions
    def visit_Dict(self, node):
        self.tags.add("hash_map")
        self.generic_visit(node)

    def visit_Set(self, node):
        self.tags.add("hash_set")
        self.generic_visit(node)

    def visit_Assign(self, node):
        val = node.value
        names = [t.id for t in node.targets if isinstance(t, ast.Name)]
        if isinstance(val, (ast.List, ast.ListComp)) or (isinstance(val, ast.Call) and _call_name(val) in ("list", "sorted")):
            self.list_names.update(names)
        if isinstance(val, ast.BinOp) and isinstance(val.op, ast.Mult) and isinstance(val.left, ast.List):
            self.table_1d = True
            self.list_names.update(names)
        if isinstance(val, ast.ListComp) and isinstance(val.elt, (ast.List, ast.BinOp, ast.ListComp)):
            self.table_2d = True
        if isinstance(val, ast.BinOp) and isinstance(val.op, ast.FloorDiv):
            inner = val.left
            if isinstance(inner, ast.BinOp) and isinstance(inner.op, (ast.Add, ast.Sub)):
                self.has_mid = True
        for n in names:
            if n.lower() in ("memo", "cache", "seen_states") and isinstance(val, (ast.Dict, ast.Call)):
                self.memo = True
                self.tags.add("memoization")
        self.generic_visit(node)

    def visit_AugAssign(self, node):
        if self.depth > 0 and isinstance(node.op, ast.Add) and isinstance(node.value, (ast.Constant, ast.JoinedStr, ast.Subscript)):
            if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                self.string_concat_in_loop = True
        self.generic_visit(node)

    def visit_BinOp(self, node):
        if isinstance(node.op, (ast.BitAnd, ast.BitOr, ast.BitXor, ast.LShift, ast.RShift)):
            self.tags.add("bit_manipulation")
        if isinstance(node.op, ast.FloorDiv) and isinstance(node.left, ast.BinOp) and isinstance(node.left.op, (ast.Add, ast.Sub)):
            self.has_mid = True
        if isinstance(node.op, ast.RShift) and isinstance(node.left, ast.BinOp) and isinstance(node.left.op, ast.Add):
            self.has_mid = True
        self.generic_visit(node)

    def visit_Subscript(self, node):
        if self.depth > 0 and isinstance(node.slice, ast.Slice):
            sl = node.slice
            if sl.lower is not None or sl.upper is not None:
                self._costly(node, "slicing inside a loop copies the slice (O(k) each time)", "slice")
        self.generic_visit(node)

    def visit_Compare(self, node):
        if self.depth > 0:
            for op, comp in zip(node.ops, node.comparators):
                if isinstance(op, (ast.In, ast.NotIn)) and isinstance(comp, ast.Name) and comp.id in self.list_names:
                    self._costly(node, "`in` on the list `{}` scans it linearly (O(n)); a set gives O(1) lookups".format(comp.id), "list_in")
        self.generic_visit(node)

    def visit_Call(self, node):
        name = _call_name(node)
        owner = _attr_owner(node)
        cur = self.func_stack[-1] if self.func_stack else None
        if name in HASH_MAP_CALLS:
            self.tags.add("hash_map")
        if name in SET_CALLS:
            self.tags.add("hash_set")
        if name == "deque":
            self.tags.add("deque")
        if owner == "heapq" or name in ("heappush", "heappop", "heapify", "heappushpop", "nlargest", "nsmallest"):
            self.tags.add("heap")
        if name in ("sort", "sorted"):
            self.tags.add("sorting")
            if self.depth > 0:
                self._costly(node, "sorting inside a loop costs O(k log k) on every iteration", "sort_in_loop")
        if owner == "bisect" or name in ("bisect_left", "bisect_right", "bisect", "insort"):
            self.tags.add("binary_search")
        if name in ("popleft", "appendleft"):
            self.popleft_like = True
        if name == "append" and owner:
            self.append_names.add(owner)
        if name == "pop" and owner:
            if node.args and isinstance(node.args[0], ast.Constant) and node.args[0].value == 0:
                if self.depth > 0:
                    self._costly(node, "`{}.pop(0)` shifts every element (O(n)); use collections.deque.popleft()".format(owner), "pop0")
                self.tags.add("queue")
            elif not node.args or (isinstance(node.args[0], ast.UnaryOp) and isinstance(node.args[0].op, ast.USub)):
                self.pop_names.add(owner)
        if name == "insert" and node.args and isinstance(node.args[0], ast.Constant) and node.args[0].value == 0 and self.depth > 0:
            self._costly(node, "`insert(0, x)` shifts every element (O(n))", "insert0")
        if name in ("index", "count", "remove") and owner and self.depth > 0 and owner in self.list_names:
            self._costly(node, "`{}.{}()` scans the list (O(n)) on every iteration".format(owner, name), "scan")
        if name == "join" and isinstance(node.func, ast.Attribute):
            self.tags.add("string_building")
        if self.depth > 0 and name in LINEAR_BUILTINS and isinstance(node.func, ast.Name) and node.args:
            arg = node.args[0]
            if isinstance(arg, (ast.Name, ast.Subscript, ast.Attribute)) or isinstance(arg, COMP_NODES):
                if name not in ("set", "dict", "list", "tuple") or isinstance(arg, (ast.Name, ast.Attribute)):
                    self._costly(node, "`{}()` over a collection inside a loop is O(n) per iteration".format(name), "builtin_scan")
        # recursion: calling the enclosing function (or self.<method>) by name
        if cur is not None:
            target = None
            if isinstance(node.func, ast.Name):
                target = node.func.id
            elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == "self":
                target = node.func.attr
            if target is not None and any(f.name == target for f in self.func_stack):
                for f in self.func_stack:
                    if f.name == target:
                        f.recursive_calls += 1
                self.tags.add("recursion")
        self.generic_visit(node)

    def _costly(self, node, message, kind):
        self.costly.append({"line": getattr(node, "lineno", None), "message": message, "kind": kind, "depth": self.depth})


def analyze_code(code, method_name):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"ok": False, "error": "SyntaxError: {} (line {})".format(e.msg, e.lineno)}
    a = Analyzer(method_name)
    a.visit(tree)

    tags = set(a.tags)
    stack_names = a.append_names & a.pop_names
    if stack_names:
        tags.add("stack")
    if a.popleft_like and "deque" in tags:
        tags.add("queue")
    if a.has_mid and a.has_pointer_loop:
        tags.add("binary_search")
    elif a.has_pointer_loop and not a.has_mid:
        tags.add("two_pointers")
    if a.table_2d:
        tags.add("2d_table")
    if a.table_1d:
        tags.add("array_table")

    recursive_fns = [f for f in a.functions if f.recursive_calls > 0]
    branching = any(f.recursive_calls >= 2 for f in recursive_fns)
    memo = a.memo
    costly = sorted(a.costly, key=lambda c: (c["line"] or 0))
    hidden_linear_in_loop = any(c["kind"] in ("pop0", "insert0", "list_in", "scan", "builtin_scan", "slice") for c in costly)
    deepest_costly = max([c["depth"] for c in costly if c["kind"] in ("pop0", "insert0", "list_in", "scan", "builtin_scan", "slice")] or [0])

    depth = a.max_depth
    effective = max(depth, deepest_costly + 1 if hidden_linear_in_loop else 0)

    # ------------------------------------------------ heuristic time estimate
    notes = []
    if recursive_fns and not memo and branching and "2d_table" not in tags:
        time_est = "O(2^n)"
        notes.append("Recursion with multiple branches and no memoization can grow exponentially.")
    elif recursive_fns and memo:
        time_est = "O(states)"
        notes.append("Memoized recursion: total work is roughly (number of distinct states) x (work per state).")
    elif effective == 0:
        if "binary_search" in tags:
            time_est = "O(log n)"
        elif recursive_fns:
            time_est = "O(n)"
        else:
            time_est = "O(1)"
    elif effective == 1:
        if "sorting" in tags:
            time_est = "O(n log n)"
        elif "heap" in tags:
            time_est = "O(n log n)"
        elif "binary_search" in tags and depth <= 1 and a.loop_count <= 1:
            time_est = "O(log n)"
        else:
            time_est = "O(n)"
    elif effective == 2:
        time_est = "O(n²)"
    elif effective == 3:
        time_est = "O(n³)"
    else:
        time_est = "O(n^{})".format(effective)

    if hidden_linear_in_loop:
        notes.append("Some operations inside loops take linear time themselves, which multiplies the cost of the loop.")

    # ------------------------------------------------ heuristic space estimate
    if "2d_table" in tags:
        space_est = "O(n·m)"
    elif tags & {"hash_map", "hash_set", "heap", "deque", "queue", "stack", "array_table", "memoization"} or a.list_names:
        space_est = "O(n)"
    elif recursive_fns:
        space_est = "O(n)"
        notes.append("Recursion uses call-stack space proportional to its depth.")
    else:
        space_est = "O(1)"

    main = next((f for f in a.functions if f.name == method_name), None)
    passes = main.top_level_loops if main else None

    lines = [ln for ln in code.splitlines() if ln.strip() and not ln.strip().startswith("#")]
    return {
        "ok": True,
        "loop_depth": depth,
        "effective_depth": effective,
        "loop_count": a.loop_count,
        "passes": passes,
        "recursive": bool(recursive_fns),
        "branching_recursion": branching,
        "memoized": memo,
        "tags": sorted(tags),
        "costly": costly[:8],
        "time_estimate": time_est,
        "space_estimate": space_est,
        "notes": notes,
        "lines_of_code": len(lines),
        "is_empty": _is_stub(tree, method_name),
    }


def _is_stub(tree, method_name):
    """True if the target method body is only `pass`/docstring/ellipsis."""
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == method_name:
            for stmt in node.body:
                if isinstance(stmt, ast.Pass):
                    continue
                if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant):
                    continue
                return False
            return True
    return False


def run_analyze_mode(payload):
    method = payload.get("method") or ""
    results = {}
    for key, code in (payload.get("codes") or {}).items():
        try:
            results[key] = analyze_code(code, method)
        except Exception as e:  # noqa: BLE001
            results[key] = {"ok": False, "error": "{}: {}".format(type(e).__name__, e)}
    emit({"type": "analysis", "results": results})
    emit({"type": "done"})
