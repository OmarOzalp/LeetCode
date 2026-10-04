"""Entry point for the local Python runner.

Reads a JSON payload from stdin and writes one JSON record per line to stdout,
each prefixed with the ASCII record separator (\\x1e) so stray prints from user
code can never be mistaken for results.

Modes: test | benchmark | snippet | analyze
"""

import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

from sandbox import Worker, emit, set_resource_limits  # noqa: E402


def run_test_mode(payload, worker):
    from judge import Judge, LoadError, load_solution, parse_custom_inputs
    from values import DatasetError, InputParseError

    runner = payload["runner"]
    tests = payload["tests"]
    class_name = runner.get("class_name", "Solution")
    judge = Judge(runner, worker, payload.get("time_limit_s", 3.0))
    progress = {"index": None, "done": set()}

    def job():
        try:
            cls, module_stdout = load_solution(payload["code"], class_name, worker)
        except LoadError as e:
            emit({"type": "load_error", "error": e.info})
            return
        emit({"type": "loaded", "stdout": module_stdout})

        ref_cls = None
        if payload.get("reference_code"):
            try:
                ref_cls, _ = load_solution(payload["reference_code"], class_name, worker, filename="<reference>")
            except LoadError:
                ref_cls = None

        timeouts = 0
        max_timeouts = payload.get("max_timeouts", 2)
        for t in tests:
            idx = t["index"]
            progress["index"] = idx
            record = {"type": "result", "index": idx}
            if timeouts >= max_timeouts:
                record.update(status="not_run", message="Skipped after repeated time limit errors.")
                emit(record)
                progress["done"].add(idx)
                continue
            try:
                if payload.get("custom"):
                    try:
                        inputs = parse_custom_inputs(runner, t.get("raw") or {})
                    except InputParseError as e:
                        record.update(status="invalid_input", message=str(e))
                        emit(record)
                        progress["done"].add(idx)
                        continue
                    record["input"] = inputs
                    expected = None
                    has_expected = False
                    if ref_cls is not None:
                        ref = judge.execute(ref_cls, inputs)
                        if ref.get("error") is None and not ref.get("timed_out"):
                            expected = ref.get("output")
                            has_expected = True
                else:
                    inputs = t["input"]
                    expected = t.get("expected")
                    has_expected = True

                res = judge.execute(cls, inputs)
                if has_expected:
                    status, message = judge.check(res, expected, inputs)
                    if payload.get("custom") and status == "failed" and runner.get("compare") == "custom":
                        message = message or "Your output differs from the reference solution's (other answers may also be valid)."
                else:
                    status, message = ("error", None) if res.get("error") else ("timeout", None) if res.get("timed_out") else ("ran", None)
                if status == "timeout":
                    timeouts += 1
                record.update(
                    status=status,
                    message=message,
                    output=res.get("output"),
                    expected=expected if has_expected else None,
                    has_expected=has_expected,
                    elapsed_ms=round(res.get("elapsed_ms", 0.0), 3),
                    stdout=res.get("stdout", ""),
                    error=res.get("error"),
                    note=res.get("note"),
                )
            except DatasetError as e:
                record.update(status="internal_error", message="Test data problem: {}".format(e))
            except InputParseError as e:
                record.update(status="invalid_input", message=str(e))
            except Exception as e:  # unexpected harness failure; report and continue
                record.update(status="internal_error", message="{}: {}".format(type(e).__name__, e))
            emit(_json_safe(record))
            progress["done"].add(idx)

    def on_hard_timeout():
        current = progress["index"]
        for t in tests:
            idx = t["index"]
            if idx in progress["done"]:
                continue
            if idx == current:
                emit({"type": "result", "index": idx, "status": "timeout", "hard": True})
            else:
                emit({"type": "result", "index": idx, "status": "not_run"})
        emit({"type": "done", "aborted": True})

    worker.run(job, on_hard_timeout)
    emit({"type": "done"})


def run_snippet_mode(payload, worker):
    from sandbox import describe_exception, describe_syntax_error, make_namespace

    code = payload["code"]
    try:
        compiled = compile(code, "solution.py", "exec")
    except SyntaxError as err:
        emit({"type": "snippet", "stdout": "", "error": dict(describe_syntax_error(err), kind="compile")})
        emit({"type": "done"})
        return

    result = {}

    def job():
        ns = make_namespace()
        ns["__name__"] = "__main__"
        run = worker.guarded_call(lambda: exec(compiled, ns), payload.get("time_limit_s", 5.0))
        err = None
        if run["timed_out"]:
            err = {"type": "TimeLimitExceeded", "message": "Execution stopped: time limit exceeded.", "line": None, "hint": None}
        elif run["error"] is not None:
            err = describe_exception(run["error"], run["error"].__traceback__)
        result.update(stdout=run["stdout"], error=err, elapsed_ms=round(run["elapsed_ms"], 3))
        emit(dict(type="snippet", **result))

    def on_hard_timeout():
        emit({"type": "snippet", "stdout": "", "error": {"type": "TimeLimitExceeded", "message": "Execution stopped: time limit exceeded.", "line": None, "hint": None}})
        emit({"type": "done"})

    worker.run(job, on_hard_timeout)
    emit({"type": "done"})


def _json_safe(record):
    try:
        json.dumps(record, allow_nan=False)
        return record
    except (TypeError, ValueError):
        from values import to_jsonable

        return to_jsonable(record)


def main():
    set_resource_limits()
    raw = sys.stdin.read()
    sys.stdin = io.StringIO("")
    payload = json.loads(raw)
    mode = payload.get("mode")
    worker = Worker()
    sys.setrecursionlimit(100000)
    if mode == "test":
        run_test_mode(payload, worker)
    elif mode == "benchmark":
        from bench import run_benchmark_mode

        run_benchmark_mode(payload, worker)
    elif mode == "snippet":
        run_snippet_mode(payload, worker)
    elif mode == "analyze":
        from analyze import run_analyze_mode

        run_analyze_mode(payload)
    else:
        emit({"type": "fatal", "message": "Unknown mode: {}".format(mode)})


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        import traceback

        emit({"type": "fatal", "message": "{}: {}".format(type(exc).__name__, exc), "traceback": traceback.format_exc()})
    sys.stdout.flush()
    os._exit(0)
