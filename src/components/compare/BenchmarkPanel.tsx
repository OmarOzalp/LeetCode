import { useState } from "react";
import clsx from "clsx";
import { Gauge, Info, Play } from "lucide-react";
import type { BenchCell, BenchmarkResponse, ProblemDetail } from "@shared/api";
import { api } from "@/lib/api";
import { formatMs } from "@/lib/format";
import { summarizeBenchmark } from "@/lib/growth";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorBox } from "@/components/problem/TestResults";
import { BenchmarkChart } from "./BenchmarkChart";

function Cell({ cell }: { cell: BenchCell }) {
  if (cell.status === "ok") return <span className="tabular-nums">{formatMs(cell.ms)}</span>;
  if (cell.status === "timeout") return <span className="text-warning">&gt; 2.5 s (stopped)</span>;
  if (cell.status === "error") return <span className="text-danger" title={cell.error}>error</span>;
  if (cell.status === "skipped") return <span className="text-subtle">skipped</span>;
  return <span className="text-subtle">—</span>;
}

export function BenchmarkPanel({ problem, code }: { problem: ProblemDetail; code: string }) {
  const [state, setState] = useState<{ loading: boolean; result: BenchmarkResponse | null; error: string | null }>({
    loading: false,
    result: null,
    error: null,
  });

  const run = async () => {
    setState({ loading: true, result: state.result, error: null });
    try {
      const result = await api.benchmark(problem.slug, code);
      setState({ loading: false, result, error: null });
    } catch (e) {
      setState({ loading: false, result: null, error: (e as Error).message });
    }
  };

  if (!problem.benchmark) {
    return (
      <Card>
        <CardHeader title="Benchmark" icon={<Gauge className="size-4" />} />
        <p className="px-4 pt-2 pb-4 text-[13px] text-muted">
          This problem has a fixed-size input (or exponential search space), so an input-size benchmark isn't meaningful. Rely on the complexity analysis above.
        </p>
      </Card>
    );
  }

  const res = state.result;
  const summary = res && res.rows.length ? summarizeBenchmark(res.rows) : null;

  return (
    <Card className={clsx(state.loading && res && "opacity-70")}>
      <CardHeader
        title="Benchmark: yours vs optimal"
        icon={<Gauge className="size-4" />}
        subtitle={`Generated inputs of increasing size (${problem.benchmark.size_label}): ${problem.benchmark.sizes.map((s) => s.toLocaleString()).join(", ")}`}
        action={
          <Button size="sm" variant="primary" icon={<Play className="size-3.5" />} loading={state.loading} onClick={run}>
            {res ? "Run again" : "Run benchmark"}
          </Button>
        }
      />
      <div className="px-4 pt-3 pb-4">
        {state.error && <div className="mb-3 rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2 text-[13px] text-danger">{state.error}</div>}
        {res?.status === "load_error" && res.loadError && <ErrorBox error={res.loadError} title="Your code could not be loaded" />}
        {res?.status === "error" && <div className="text-[13px] text-danger">{res.message}</div>}
        {!res && !state.loading && (
          <p className="text-[13px] text-muted">
            Times both implementations on the same generated inputs. Each run is limited to 2.5 s; once a size is too slow, larger sizes are skipped.
          </p>
        )}
        {state.loading && !res && <p className="text-[13px] text-muted">Running… this can take up to ~30 seconds for slow solutions.</p>}

        {res && res.rows.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-1.5 pr-3 font-medium">Input size</th>
                    <th className="py-1.5 pr-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-3 rounded bg-series-1" /> Yours
                      </span>
                    </th>
                    <th className="py-1.5 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-3 rounded bg-series-2" /> Optimal
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {res.rows.map((r) => (
                    <tr key={r.n} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-3 text-muted tabular-nums">{r.n.toLocaleString()}</td>
                      <td className="py-1.5 pr-3">
                        <Cell cell={r.user} />
                        {r.match === false && <span className="ml-1 text-xs text-danger" title="Your output differed from the optimal solution's">≠</span>}
                      </td>
                      <td className="py-1.5">
                        <Cell cell={r.reference} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary && (
                <div className="mt-3 flex flex-col gap-1.5 text-[13px]">
                  {summary.sentences.map((s, i) => (
                    <p key={i} className={i < 2 ? "text-fg" : "text-muted"}>
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <BenchmarkChart rows={res.rows} sizeLabel={problem.benchmark.size_label} />
          </div>
        )}
        {res?.notes.map((n, i) => (
          <p key={i} className="mt-2 text-xs text-muted">
            {n}
          </p>
        ))}
        {res && (
          <p className="mt-4 flex gap-1.5 text-xs text-subtle">
            <Info className="mt-px size-3.5 shrink-0" />
            These are empirical wall-clock measurements on your machine — noisy, and affected by constant factors (for example, built-ins implemented in C). They
            illustrate growth; they are not a proof. The stated Big-O comes from the algorithm itself.
          </p>
        )}
      </div>
    </Card>
  );
}
