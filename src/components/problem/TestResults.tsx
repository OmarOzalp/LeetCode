import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, Info, Lightbulb, XCircle } from "lucide-react";
import type { ProblemDetail, RunResponse, RuntimeErrorInfo, TestResult } from "@shared/api";
import { formatMs } from "@/lib/format";
import { DesignTable, InputView, outputName, outputType } from "./DescriptionPanel";
import { ValueView } from "./ValueView";

export function statusIcon(status: TestResult["status"], className = "size-3.5") {
  switch (status) {
    case "passed":
      return <CheckCircle2 className={clsx(className, "text-success")} />;
    case "ran":
      return <CheckCircle2 className={clsx(className, "text-muted")} />;
    case "timeout":
      return <Clock className={clsx(className, "text-warning")} />;
    case "not_run":
      return <CircleSlash className={clsx(className, "text-subtle")} />;
    case "invalid_input":
    case "internal_error":
      return <AlertTriangle className={clsx(className, "text-warning")} />;
    default:
      return <XCircle className={clsx(className, "text-danger")} />;
  }
}

export function ErrorBox({
  error,
  title,
  onLine,
}: {
  error: RuntimeErrorInfo;
  title?: string;
  onLine?: (line: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-danger/30 bg-danger/[0.07]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="font-mono text-[12.5px] text-danger">
          {title && <span className="mr-2 font-sans text-xs font-semibold tracking-wide uppercase">{title}</span>}
          <span className="font-semibold">{error.type}</span>
          {error.message ? `: ${error.message}` : ""}
        </div>
        {error.line != null && (
          <button
            type="button"
            onClick={() => onLine?.(error.line!)}
            className="rounded-md border border-danger/30 px-1.5 py-0.5 font-mono text-[11px] text-danger hover:bg-danger/10"
            title="Jump to this line in the editor"
          >
            Line {error.line}
          </button>
        )}
      </div>
      {error.text && (
        <pre className="border-t border-danger/20 px-3 py-2 font-mono text-[12px] text-fg">
          {error.text}
          {error.column ? "\n" + " ".repeat(Math.max(0, error.column - 1)) + "^" : ""}
        </pre>
      )}
      {error.traceback && <pre className="overflow-x-auto border-t border-danger/20 px-3 py-2 font-mono text-[11.5px] text-muted">{error.traceback}</pre>}
      {error.hint && (
        <div className="flex gap-2 border-t border-danger/20 bg-surface/40 px-3 py-2 text-[12.5px] text-fg">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <span>{error.hint}</span>
        </div>
      )}
    </div>
  );
}

function Callout({ tone, children }: { tone: "warning" | "info"; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "flex gap-2 rounded-lg border px-3 py-2 text-[12.5px]",
        tone === "warning" ? "border-warning/30 bg-warning/[0.07]" : "border-border bg-surface-2/60",
      )}
    >
      {tone === "warning" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-muted" />}
      <span>{children}</span>
    </div>
  );
}

function Section({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="min-w-0">
      <div
        className={clsx(
          "mb-1 text-[11px] font-medium tracking-wide uppercase",
          tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : "text-subtle",
        )}
      >
        {label}
      </div>
      <div className={clsx("rounded-md border px-3 py-2", tone === "bad" ? "border-danger/25 bg-danger/[0.04]" : "border-border bg-surface-2/40")}>
        {children}
      </div>
    </div>
  );
}

export function TestDetail({ result, problem, onLine }: { result: TestResult; problem: ProblemDetail; onLine?: (line: number) => void }) {
  const isDesign = problem.runner.kind === "design";
  const outType = outputType(problem);
  const outName = outputName(problem);
  const failed = result.status === "failed";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {statusIcon(result.status, "size-4")}
        <span className="text-[13px] font-semibold">{result.name}</span>
        {result.kind === "hidden" && <span className="rounded bg-surface-3 px-1.5 py-px text-[10px] text-muted uppercase">edge case</span>}
        <span className={clsx("text-xs", result.status === "passed" ? "text-success" : result.status === "failed" || result.status === "error" ? "text-danger" : "text-muted")}>
          {STATUS_TEXT[result.status]}
        </span>
        {result.runtimeMs !== undefined && result.status !== "timeout" && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
            <Clock className="size-3" /> {formatMs(result.runtimeMs)}
          </span>
        )}
      </div>

      {result.status === "timeout" && (
        <Callout tone="warning">
          <strong>Execution stopped: time limit exceeded.</strong> This test ran longer than the limit. Look for an infinite loop (a pointer that never moves, a
          missing <code>break</code>) or an approach that is too slow.
        </Callout>
      )}
      {result.status === "invalid_input" && <Callout tone="warning">{result.message}</Callout>}
      {result.status === "internal_error" && <Callout tone="warning">{result.message}</Callout>}
      {result.status === "not_run" && <Callout tone="info">{result.message ?? "This test did not run because an earlier problem stopped execution."}</Callout>}
      {result.error && <ErrorBox error={result.error} title="Runtime error" onLine={onLine} />}
      {result.message && (result.status === "failed" || result.status === "passed") && <Callout tone="warning">{result.message}</Callout>}

      {isDesign ? (
        <Section label="Operations">
          <DesignTable
            input={result.input}
            output={result.hasExpected ? (result.expected as unknown[]) : undefined}
            received={Array.isArray(result.output) ? (result.output as unknown[]) : undefined}
          />
        </Section>
      ) : (
        <>
          {Object.keys(result.input).length > 0 && (
            <Section label="Input">
              <InputView input={result.input} problem={problem} />
            </Section>
          )}
          {result.status !== "not_run" && result.status !== "invalid_input" && (
            <div className={clsx("grid gap-3", result.hasExpected ? "sm:grid-cols-2" : "grid-cols-1")}>
              {result.hasExpected && (
                <Section label={result.kind === "custom" ? "Expected (from optimal solution)" : "Expected"}>
                  <ValueView value={result.expected} type={outType} name={outName} />
                </Section>
              )}
              {!result.error && result.status !== "timeout" && (
                <Section label={failed ? "Your output" : "Output"} tone={failed ? "bad" : result.status === "passed" ? "good" : undefined}>
                  <ValueView value={result.output} type={outType} name={outName} />
                </Section>
              )}
            </div>
          )}
        </>
      )}
      {result.note && <Callout tone="info">{result.note}</Callout>}
      {result.stdout && (
        <Section label="Stdout">
          <pre className="max-h-48 overflow-auto font-mono text-[12px] whitespace-pre-wrap text-muted">{result.stdout}</pre>
        </Section>
      )}
    </div>
  );
}

const STATUS_TEXT: Record<TestResult["status"], string> = {
  passed: "Passed",
  failed: "Wrong answer",
  error: "Runtime error",
  timeout: "Time limit exceeded",
  not_run: "Not run",
  invalid_input: "Invalid input",
  internal_error: "Runner error",
  ran: "Ran",
};

export function RunSummary({ response }: { response: RunResponse }) {
  if (response.status === "compile_error" || response.status === "load_error") return null;
  const failedCount = response.results.filter((r) => r.status !== "passed").length;
  if (response.mode === "custom") {
    return <div className="text-[13px] text-muted">Ran {response.total} custom test{response.total === 1 ? "" : "s"}.</div>;
  }
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {response.allPassed ? (
        <span className="text-[15px] font-semibold text-success">✓ All tests passed</span>
      ) : (
        <span className="text-[15px] font-semibold text-danger">
          ✗ {failedCount} test{failedCount === 1 ? "" : "s"} failed
        </span>
      )}
      <span className="text-[13px] text-muted tabular-nums">
        {response.passed} / {response.total} passed{response.mode === "examples" ? " (examples only)" : ""} · {formatMs(response.totalRuntimeMs)} total
      </span>
    </div>
  );
}

/** List of tests on the left, details of the selected test on the right. */
export function ResultsView({ response, problem, onLine }: { response: RunResponse; problem: ProblemDetail; onLine?: (line: number) => void }) {
  const firstBad = response.results.find((r) => r.status !== "passed" && r.status !== "ran");
  const [selected, setSelected] = useState<number>(firstBad?.index ?? 0);
  useEffect(() => {
    setSelected(response.results.find((r) => r.status !== "passed" && r.status !== "ran")?.index ?? 0);
  }, [response]);

  if (response.status === "compile_error" || response.status === "load_error") {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[15px] font-semibold text-danger">{response.status === "compile_error" ? "✗ Syntax error" : "✗ Your code could not be loaded"}</div>
        {response.loadError && <ErrorBox error={response.loadError} onLine={onLine} />}
        <p className="text-xs text-muted">No tests ran. Fix the error above and run again.</p>
      </div>
    );
  }

  const current = response.results.find((r) => r.index === selected) ?? response.results[0];
  return (
    <div className="flex flex-col gap-3">
      <RunSummary response={response} />
      {response.message && <Callout tone="warning">{response.message}</Callout>}
      {response.moduleStdout && (
        <Section label="Printed while loading your code">
          <pre className="max-h-32 overflow-auto font-mono text-[12px] whitespace-pre-wrap text-muted">{response.moduleStdout}</pre>
        </Section>
      )}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Test cases">
        {response.results.map((r) => (
          <button
            key={r.index}
            type="button"
            role="tab"
            aria-selected={r.index === selected}
            onClick={() => setSelected(r.index)}
            className={clsx(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
              r.index === selected ? "border-border-strong bg-surface-3 text-fg" : "border-border text-muted hover:bg-surface-2 hover:text-fg",
            )}
            title={r.name}
          >
            {statusIcon(r.status)}
            {r.kind === "hidden" ? `Test ${r.index + 1}` : r.name.replace("Example ", "Ex ")}
          </button>
        ))}
      </div>
      {current && <TestDetail result={current} problem={problem} onLine={onLine} />}
    </div>
  );
}
