import { useState } from "react";
import clsx from "clsx";
import { FlaskConical, ListChecks, Play, Plus, Save, SquareTerminal, Trash2 } from "lucide-react";
import type { ProblemDetail, RunResponse, SavedCustomTest } from "@shared/api";
import { Tabs } from "@/components/ui/Tabs";
import { Button, Spinner } from "@/components/ui/Button";
import { pyRepr } from "@/lib/format";
import { useAppStore, useProgress } from "@/lib/store";
import { DesignTable, InputView } from "./DescriptionPanel";
import { ValueView } from "./ValueView";
import { ResultsView } from "./TestResults";
import { outputName, outputType } from "./DescriptionPanel";

export type ConsoleTab = "testcases" | "results" | "custom";

export interface RunState {
  running: "all" | "examples" | "custom" | null;
  last: RunResponse | null;
  lastCustom: RunResponse | null;
  error: string | null;
}

export function ConsolePanel({
  problem,
  tab,
  onTab,
  run,
  onRunCustom,
  onLine,
  successSlot,
}: {
  problem: ProblemDetail;
  tab: ConsoleTab;
  onTab: (t: ConsoleTab) => void;
  run: RunState;
  onRunCustom: (values: Record<string, string>[]) => void;
  onLine: (line: number) => void;
  successSlot?: React.ReactNode;
}) {
  const last = run.last;
  const badge = last ? (
    <span
      className={clsx(
        "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
        last.allPassed ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
      )}
    >
      {last.status === "ok" ? `${last.passed}/${last.total}` : "!"}
    </span>
  ) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2">
        <Tabs<ConsoleTab>
          size="sm"
          value={tab}
          onChange={onTab}
          items={[
            { id: "testcases", label: "Testcases", icon: <ListChecks className="size-3.5" /> },
            { id: "results", label: "Results", icon: <SquareTerminal className="size-3.5" />, badge },
            { id: "custom", label: "Custom", icon: <FlaskConical className="size-3.5" /> },
          ]}
        />
        {run.running && (
          <span className="mr-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <Spinner className="size-3.5" /> Running…
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === "testcases" && <TestcasesView problem={problem} />}
        {tab === "results" &&
          (run.error ? (
            <div className="rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2 text-[13px] text-danger">{run.error}</div>
          ) : last ? (
            <div className="flex flex-col gap-3">
              {successSlot}
              <ResultsView response={last} problem={problem} onLine={onLine} />
            </div>
          ) : (
            <EmptyResults running={!!run.running} />
          ))}
        {tab === "custom" && <CustomTests problem={problem} run={run} onRun={onRunCustom} onLine={onLine} />}
      </div>
    </div>
  );
}

function EmptyResults({ running }: { running: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-[13px] text-muted">
      {running ? <Spinner className="size-5" /> : <SquareTerminal className="size-6 text-subtle" />}
      {running ? "Running your code…" : "Run your code to see results here."}
    </div>
  );
}

function TestcasesView({ problem }: { problem: ProblemDetail }) {
  const [i, setI] = useState(0);
  const ex = problem.examples[i] ?? problem.examples[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {problem.examples.map((_, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setI(k)}
            className={clsx(
              "h-7 rounded-md border px-2.5 text-xs",
              k === i ? "border-border-strong bg-surface-3 text-fg" : "border-border text-muted hover:bg-surface-2",
            )}
          >
            Case {k + 1}
          </button>
        ))}
        <span className="ml-2 text-xs text-subtle">+ {problem.hidden_test_count} hidden edge cases on Run Tests</span>
      </div>
      {problem.runner.kind === "design" ? (
        <DesignTable input={ex.input} output={ex.output as unknown[]} />
      ) : (
        <>
          <InputView input={ex.input} problem={problem} />
          <div>
            <div className="mb-0.5 font-mono text-[12px] text-subtle">expected =</div>
            <ValueView value={ex.output} type={outputType(problem)} name={outputName(problem)} />
          </div>
        </>
      )}
    </div>
  );
}

function defaultValues(problem: ProblemDetail, exampleIndex = 0): Record<string, string> {
  const ex = problem.examples[exampleIndex] ?? problem.examples[0];
  const out: Record<string, string> = {};
  for (const name of problem.input_names) out[name] = pyRepr(ex.input[name], 100_000);
  return out;
}

function CustomTests({
  problem,
  run,
  onRun,
  onLine,
}: {
  problem: ProblemDetail;
  run: RunState;
  onRun: (values: Record<string, string>[]) => void;
  onLine: (line: number) => void;
}) {
  const progress = useProgress(problem.slug);
  const patch = useAppStore((s) => s.patchProgress);
  const saved = progress.customTests ?? [];
  const [values, setValues] = useState<Record<string, string>>(() => saved[0]?.values ?? defaultValues(problem));

  const save = () => {
    const entry: SavedCustomTest = { id: Math.random().toString(36).slice(2, 10), values, createdAt: new Date().toISOString() };
    const deduped = saved.filter((s) => JSON.stringify(s.values) !== JSON.stringify(values));
    void patch(problem.slug, { customTests: [entry, ...deduped].slice(0, 10) });
  };
  const remove = (id: string) => void patch(problem.slug, { customTests: saved.filter((s) => s.id !== id) });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Enter Python (or JSON) literals. The optimal solution runs on the same input so you can compare outputs.
      </p>
      <div className="grid gap-2.5">
        {problem.input_names.map((name) => (
          <label key={name} className="block">
            <span className="mb-1 flex items-baseline gap-2 font-mono text-[12px]">
              <span className="text-fg">{name}</span>
              <span className="text-subtle">{problem.input_types[name]?.replace(/^ref:/, "") ?? ""}</span>
            </span>
            <textarea
              value={values[name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
              rows={Math.min(4, Math.max(1, Math.ceil((values[name]?.length ?? 0) / 70)))}
              spellCheck={false}
              aria-label={`Custom value for ${name}`}
              className="w-full resize-y rounded-md border border-border bg-code-bg px-2.5 py-1.5 font-mono text-[12.5px] focus:border-accent focus:outline-none"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" icon={<Play className="size-3.5" />} loading={run.running === "custom"} onClick={() => onRun([values])}>
          Run custom test
        </Button>
        <Button size="sm" icon={<Save className="size-3.5" />} onClick={save}>
          Save
        </Button>
        {saved.length > 1 && (
          <Button size="sm" variant="ghost" onClick={() => onRun(saved.map((s) => s.values))} disabled={!!run.running}>
            Run all saved ({saved.length})
          </Button>
        )}
        <span className="ml-auto flex items-center gap-1">
          {problem.examples.map((_, i) => (
            <button
              key={i}
              type="button"
              className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted hover:bg-surface-2 hover:text-fg"
              onClick={() => setValues(defaultValues(problem, i))}
              title={`Load example ${i + 1}`}
            >
              <Plus className="size-3" /> Ex {i + 1}
            </button>
          ))}
        </span>
      </div>

      {saved.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Saved tests</div>
          <ul className="flex flex-col gap-1">
            {saved.map((s, i) => (
              <li key={s.id} className="group flex items-center gap-2 rounded-md border border-border px-2 py-1">
                <button type="button" className="min-w-0 flex-1 truncate text-left font-mono text-[11.5px] text-muted hover:text-fg" onClick={() => setValues(s.values)} title="Load into the form">
                  <span className="mr-2 font-sans text-subtle">#{i + 1}</span>
                  {Object.entries(s.values)
                    .map(([k, v]) => `${k} = ${v}`)
                    .join(", ")}
                </button>
                <button type="button" onClick={() => remove(s.id)} className="text-subtle hover:text-danger" aria-label="Delete saved test">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {run.lastCustom && (
        <div className="border-t border-border pt-3">
          <ResultsView response={run.lastCustom} problem={problem} onLine={onLine} />
        </div>
      )}
    </div>
  );
}
