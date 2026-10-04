"""Empirical benchmark: run the user's solution and the reference solution on
increasingly large generated inputs and report timings."""

import random
import time

from judge import Judge, LoadError, load_solution
from sandbox import emit, make_namespace


def run_benchmark_mode(payload, worker):
    runner = payload["runner"]
    class_name = runner.get("class_name", "Solution")
    sizes = payload["sizes"]
    per_run_limit = float(payload.get("per_run_limit_s", 2.5))
    total_budget = float(payload.get("total_budget_s", 20.0))
    progress = {"n": None, "done": set()}

    def job():
        try:
            user_cls, _ = load_solution(payload["code"], class_name, worker)
        except LoadError as e:
            emit({"type": "load_error", "error": e.info})
            return
        try:
            ref_cls, _ = load_solution(payload["reference_code"], class_name, worker, filename="<reference>")
        except LoadError as e:
            emit({"type": "fatal", "message": "Reference solution failed to load: {}".format(e.info.get("message"))})
            return

        gen_ns = make_namespace()
        exec(compile(payload["generator"], "<generator>", "exec"), gen_ns)
        generate = gen_ns["generate"]

        judge = Judge(runner, worker, per_run_limit)
        started = time.perf_counter()
        active = {"user": True, "reference": True}

        for n in sizes:
            progress["n"] = n
            rng = random.Random(7919 * n + 17)
            inputs = generate(n, rng)
            row = {"type": "bench", "n": n}
            outputs = {}
            for who, cls in (("reference", ref_cls), ("user", user_cls)):
                if not active[who]:
                    row[who] = {"status": "skipped"}
                    continue
                best = None
                reps = 0
                spent = 0.0
                status = "ok"
                error = None
                while True:
                    res = judge.execute(cls, inputs)
                    reps += 1
                    if res.get("timed_out"):
                        status = "timeout"
                        break
                    if res.get("error") is not None:
                        status = "error"
                        error = res["error"].get("type") + ": " + res["error"].get("message", "")
                        break
                    ms = res["elapsed_ms"]
                    spent += ms
                    best = ms if best is None else min(best, ms)
                    outputs[who] = res.get("output")
                    # Repeat fast runs to reduce noise; keep total work bounded.
                    if spent > 150 or reps >= 7 or ms > 50:
                        break
                cell = {"status": status, "ms": round(best, 4) if best is not None else None, "reps": reps}
                if error:
                    cell["error"] = error[:300]
                row[who] = cell
                if status != "ok":
                    active[who] = False
                elif best is not None and best > per_run_limit * 1000 * 0.4:
                    # The next size would almost certainly exceed the limit.
                    active[who] = False
                    cell["stopped_after"] = True
            if "user" in outputs and "reference" in outputs:
                try:
                    ok, _ = judge.check({"output": outputs["user"]}, outputs["reference"], inputs)
                    row["match"] = ok == "passed"
                except Exception:
                    row["match"] = None
            emit(row)
            progress["done"].add(n)
            if time.perf_counter() - started > total_budget:
                emit({"type": "note", "message": "Stopped early to keep the benchmark under {:.0f}s.".format(total_budget)})
                break
            if not active["user"] and not active["reference"]:
                break

    def on_hard_timeout():
        n = progress["n"]
        if n is not None and n not in progress["done"]:
            emit({"type": "bench", "n": n, "user": {"status": "timeout"}, "reference": {"status": "unknown"}})
        emit({"type": "done", "aborted": True})

    worker.run(job, on_hard_timeout)
    emit({"type": "done"})
