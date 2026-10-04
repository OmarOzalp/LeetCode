import { useEffect, useMemo, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import clsx from "clsx";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Columns2, Equal, FileDiff, HelpCircle, Sparkles, TrendingUp } from "lucide-react";
import type { AnalyzeResponse, ProblemDetail } from "@shared/api";
import type { Relation } from "@shared/complexity";
import "@/lib/monaco";
import { api } from "@/lib/api";
import { buildComparison, type Comparison } from "@/lib/compare";
import { useAppStore, useProgress } from "@/lib/store";
import { Card, CardHeader } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Segmented } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { Button, Spinner } from "@/components/ui/Button";
import { RevealGate } from "@/components/problem/SolutionPanel";
import { BenchmarkPanel } from "./BenchmarkPanel";

export function CompareView({ problem, code, onBack, onHint }: { problem: ProblemDetail; code: string; onBack: () => void; onHint: () => void }) {
  const progress = useProgress(problem.slug);
  const patch = useAppStore((s) => s.patchProgress);
  const confirm = useAppStore((s) => s.settings.confirmBeforeSolution);
  const revealed = progress.solutionRevealed || !confirm;

  useEffect(() => {
    if (!confirm && !progress.solutionRevealed) void patch(problem.slug, { solutionRevealed: true });
  }, [confirm, progress.solutionRevealed, patch, problem.slug]);

  if (!revealed) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RevealGate
          what="the optimal solution to compare"
          hintsRevealed={Math.min(progress.hintsRevealed, problem.hints.length)}
          hintsTotal={problem.hints.length}
          onHint={onHint}
          onReveal={() => void patch(problem.slug, { solutionRevealed: true })}
        />
      </div>
    );
  }
  return <CompareBody problem={problem} code={code} onBack={onBack} />;
}

function CompareBody({ problem, code, onBack }: { problem: ProblemDetail; code: string; onBack: () => void }) {
  const progress = useProgress(problem.slug);
  const theme = useAppStore((s) => s.settings.theme);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refIndex, setRefIndex] = useState(-1); // -1 = optimal
  const [mode, setMode] = useState<"side" | "diff">("side");

  useEffect(() => {
    let alive = true;
    setAnalysis(null);
    api
      .analyze(problem.slug, code)
      .then((a) => alive && setAnalysis(a))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [problem.slug, code]);

  const comparison = useMemo(() => (analysis ? buildComparison(problem, analysis) : null), [analysis, problem]);
  const refCode = refIndex < 0 ? problem.optimal_solution : problem.alternatives[refIndex].code;
  const refName = refIndex < 0 ? `Optimal · ${problem.approach}` : problem.alternatives[refIndex].name;
  const isStarter = code.trim() === problem.starter_code.trim();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-5">
        {progress.lastResult && !progress.lastResult.allPassed && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-3 py-2 text-[13px]">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            Your latest run passed {progress.lastResult.passed}/{progress.lastResult.total} tests. The comparison below is about the approach, not correctness.
          </div>
        )}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold">
              <Columns2 className="size-4 text-muted" /> Your solution vs {refIndex < 0 ? "the optimal solution" : "an alternative approach"}
            </h2>
            <div className="flex items-center gap-2">
              {problem.alternatives.length > 0 && (
                <Select
                  aria-label="Reference solution"
                  value={String(refIndex)}
                  onChange={(e) => setRefIndex(Number(e.target.value))}
                  options={[
                    { value: "-1", label: `Optimal: ${problem.approach}` },
                    ...problem.alternatives.map((a, i) => ({ value: String(i), label: a.name })),
                  ]}
                  className="w-[240px]"
                />
              )}
              <Segmented
                value={mode}
                onChange={setMode}
                items={[
                  { id: "side", label: <span className="inline-flex items-center gap-1.5"><Columns2 className="size-3.5" />Side by side</span> },
                  { id: "diff", label: <span className="inline-flex items-center gap-1.5"><FileDiff className="size-3.5" />Diff</span> },
                ]}
              />
            </div>
          </div>
          <div className="p-4">
            {mode === "side" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <CodeBlock code={code} title="Your solution" lineNumbers className="max-h-[440px] overflow-auto" />
                <CodeBlock code={refCode} title={refName} lineNumbers className="max-h-[440px] overflow-auto" />
              </div>
            ) : (
              <div className="h-[440px] overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-2 border-b border-border bg-surface/60 text-xs text-muted">
                  <span className="px-3 py-1">Your solution</span>
                  <span className="px-3 py-1">{refName}</span>
                </div>
                <DiffEditor
                  height="calc(100% - 25px)"
                  language="python"
                  original={code}
                  modified={refCode}
                  theme={theme === "dark" ? "b75-dark" : "b75-light"}
                  loading={<Spinner />}
                  options={{
                    readOnly: true,
                    originalEditable: false,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 12.5,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    renderOverviewRuler: false,
                  }}
                />
              </div>
            )}
          </div>
        </Card>

        {isStarter ? (
          <Card className="p-5 text-[13px] text-muted">
            Your editor still contains the starter code. Write a solution first, then come back to compare approaches.{" "}
            <Button size="sm" className="ml-2" onClick={onBack}>
              Back to editor
            </Button>
          </Card>
        ) : error ? (
          <Card className="p-4 text-[13px] text-danger">{error}</Card>
        ) : !comparison ? (
          <Card className="flex items-center gap-2 p-5 text-[13px] text-muted">
            <Spinner /> Analyzing your code…
          </Card>
        ) : (
          <AnalysisCard comparison={comparison} problem={problem} />
        )}

        {!isStarter && <BenchmarkPanel problem={problem} code={code} />}
      </div>
    </div>
  );
}

function RelationBadge({ rel }: { rel: Relation }) {
  const map = {
    better: { icon: <ArrowDown className="size-3" />, text: "better", cls: "bg-success/12 text-success" },
    same: { icon: <Equal className="size-3" />, text: "same", cls: "bg-surface-3 text-muted" },
    worse: { icon: <ArrowUp className="size-3" />, text: "worse", cls: "bg-danger/12 text-danger" },
    unknown: { icon: <HelpCircle className="size-3" />, text: "unclear", cls: "bg-surface-3 text-subtle" },
  }[rel];
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] font-medium", map.cls)}>{map.icon}{map.text}</span>;
}

function AnalysisCard({ comparison: c, problem }: { comparison: Comparison; problem: ProblemDetail }) {
  const toneCls = {
    optimal: "border-success/30 bg-success/[0.06]",
    good: "border-accent/30 bg-accent-soft",
    improve: "border-warning/30 bg-warning/[0.06]",
    unknown: "border-border bg-surface-2/50",
  }[c.tone];
  const ToneIcon = c.tone === "optimal" ? CheckCircle2 : c.tone === "improve" ? TrendingUp : Sparkles;

  const rows: Array<{ label: string; user: React.ReactNode; opt: React.ReactNode; rel?: Relation }> = [
    { label: "Approach", user: c.user.name, opt: c.optimal.name },
    { label: "Time complexity", user: <code className="font-mono">{c.user.time}</code>, opt: <code className="font-mono">{c.optimal.time}</code>, rel: c.time },
    { label: "Space complexity", user: <code className="font-mono">{c.user.space}</code>, opt: <code className="font-mono">{c.optimal.space}</code>, rel: c.space },
    { label: "Data structures", user: c.user.dataStructures.join(", ") || "—", opt: c.optimal.dataStructures.join(", ") || "—" },
    { label: "Passes over input", user: c.user.passes, opt: c.optimal.passes },
    { label: "Lines of code", user: c.user.linesOfCode ?? "—", opt: c.optimal.linesOfCode ?? "—" },
  ];

  return (
    <Card>
      <CardHeader title="Analysis" icon={<Sparkles className="size-4" />} subtitle="Deterministic: known complexities come from the problem's metadata; unrecognised code is estimated from its structure." />
      <div className="flex flex-col gap-4 p-4">
        <div className={clsx("rounded-lg border px-4 py-3", toneCls)}>
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <ToneIcon className={clsx("size-4", c.tone === "optimal" ? "text-success" : c.tone === "improve" ? "text-warning" : "text-accent")} />
            {c.headline}
          </div>
          <div className="mt-2 flex flex-col gap-2 text-[13.5px] leading-relaxed">
            {c.paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? "text-fg" : "text-muted"}>
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="w-44 py-2 pr-3 font-medium" />
                <th className="py-2 pr-3 font-medium">
                  Your approach
                  {c.user.basis === "estimated" && <span className="ml-1.5 font-normal text-subtle">(estimated)</span>}
                  {c.matched !== null && c.matched >= 0 && <span className="ml-1.5 font-normal text-subtle">(recognised)</span>}
                </th>
                <th className="py-2 font-medium">Optimal approach</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border/60 last:border-0 align-top">
                  <td className="py-2 pr-3 text-xs text-muted">{r.label}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {r.user}
                      {r.rel && <RelationBadge rel={r.rel} />}
                    </span>
                  </td>
                  <td className="py-2">{r.opt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {c.approachNote && (
          <div className="rounded-lg border border-border bg-surface-2/50 px-3.5 py-2.5 text-[13px]">
            <span className="font-semibold">About “{c.user.name}”: </span>
            <span className="text-muted">{c.approachNote}</span>
          </div>
        )}

        {c.hiddenCosts.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-muted">Potential hidden costs in your code</h3>
            <ul className="flex flex-col gap-1 text-[13px]">
              {c.hiddenCosts.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-subtle">{h.line ? `line ${h.line}` : ""}</span>
                  <span className="text-muted">{h.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-[13px]">
          <span className="font-semibold">Key insight of the optimal solution: </span>
          {problem.key_insight}
        </div>
      </div>
    </Card>
  );
}
