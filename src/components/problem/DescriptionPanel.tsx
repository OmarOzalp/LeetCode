import { ExternalLink } from "lucide-react";
import type { Example } from "@shared/problemSchema";
import type { ProblemDetail } from "@shared/api";
import { CategoryTag, DifficultyBadge, PatternTag } from "@/components/ui/Badges";
import { InlineMarkdown, Markdown } from "@/components/ui/Markdown";
import { pyRepr } from "@/lib/format";
import { ValueView } from "./ValueView";

export function DescriptionPanel({ problem }: { problem: ProblemDetail }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">
          <span className="text-subtle">{problem.order + 1}.</span> {problem.title}
        </h1>
        {problem.leetcode_url && (
          <a
            href={problem.leetcode_url}
            target="_blank"
            rel="noreferrer"
            title="Open on LeetCode"
            className="mt-1 shrink-0 text-subtle hover:text-fg"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <DifficultyBadge difficulty={problem.difficulty} />
        <CategoryTag category={problem.category} />
        <span className="flex flex-wrap gap-1">
          {problem.patterns.map((p) => (
            <PatternTag key={p}>{p}</PatternTag>
          ))}
        </span>
      </div>

      <Markdown className="mt-4">{problem.description}</Markdown>

      <div className="mt-5 flex flex-col gap-3">
        {problem.examples.map((ex, i) => (
          <ExampleCard key={i} index={i} example={ex} problem={problem} />
        ))}
      </div>

      <h3 className="mt-6 mb-2 text-[13px] font-semibold">Constraints</h3>
      <ul className="flex flex-col gap-1.5 text-[13px] text-muted">
        {problem.constraints.map((c, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[9px] size-1 shrink-0 rounded-full bg-subtle" />
            <InlineMarkdown>{c}</InlineMarkdown>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2 text-[13px] font-semibold">Signature</h3>
      <code className="block overflow-x-auto rounded-md border border-border bg-code-bg px-3 py-2 font-mono text-[12px] whitespace-pre text-muted">
        {problem.function_signature}
      </code>
      <p className="mt-6 text-xs text-subtle">
        {problem.examples.length} example{problem.examples.length === 1 ? "" : "s"} + {problem.hidden_test_count} hidden edge-case
        tests run when you press <strong className="text-muted">Run Tests</strong>.
      </p>
    </div>
  );
}

export function ExampleCard({ example, index, problem }: { example: Example; index: number; problem: ProblemDetail }) {
  const isDesign = problem.runner.kind === "design";
  return (
    <div className="rounded-lg border border-border bg-surface-2/50">
      <div className="border-b border-border px-3.5 py-2 text-xs font-semibold text-muted">Example {index + 1}</div>
      <div className="flex flex-col gap-3 px-3.5 py-3">
        {isDesign ? (
          <DesignTable input={example.input} output={example.output as unknown[]} />
        ) : (
          <>
            <Field label="Input">
              <InputView input={example.input} problem={problem} />
            </Field>
            <Field label="Output">
              <ValueView value={example.output} type={outputType(problem)} name={outputName(problem)} />
            </Field>
          </>
        )}
        {example.explanation && (
          <Field label="Explanation">
            <Markdown className="text-[13px] text-muted">{example.explanation}</Markdown>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</div>
      {children}
    </div>
  );
}

/** Renders `name = value` lines with visualizations for structured types. */
export function InputView({ input, problem, compact }: { input: Record<string, unknown>; problem: ProblemDetail; compact?: boolean }) {
  const names = problem.input_names.filter((n) => n in input);
  const cyclePos = problem.runner.kind === "function" ? cycleFor(problem, input) : undefined;
  return (
    <div className="flex flex-col gap-2">
      {names.map((name) => (
        <div key={name} className="min-w-0">
          <div className="mb-0.5 font-mono text-[12px] text-subtle">{name} =</div>
          <ValueView value={input[name]} type={problem.input_types[name]} name={name} cyclePos={cyclePos?.[name]} compact={compact} />
        </div>
      ))}
    </div>
  );
}

function cycleFor(problem: ProblemDetail, input: Record<string, unknown>): Record<string, number> | undefined {
  if (problem.runner.kind !== "function") return undefined;
  const out: Record<string, number> = {};
  for (const p of problem.runner.params) {
    if (p.cycle_from && typeof input[p.cycle_from] === "number") out[p.name] = input[p.cycle_from] as number;
  }
  return Object.keys(out).length ? out : undefined;
}

export function outputType(problem: ProblemDetail): string | undefined {
  const r = problem.runner;
  if (r.kind === "function") {
    if (r.mutates) return r.params.find((p) => p.name === r.mutates)?.type;
    return r.returns;
  }
  if (r.kind === "codec") return r.type;
  return undefined;
}

export function outputName(problem: ProblemDetail): string | undefined {
  const r = problem.runner;
  if (r.kind === "function" && r.mutates) return r.mutates;
  if (r.kind === "function" && /List\[List\[(int|str)\]\]/.test(r.returns) && r.params.some((p) => /^(matrix|grid|board)$/.test(p.name))) {
    return "matrix";
  }
  return undefined;
}

export function DesignTable({ input, output, received }: { input: Record<string, unknown>; output?: unknown[]; received?: unknown[] }) {
  const ops = (input.operations as string[]) ?? [];
  const args = (input.arguments as unknown[][]) ?? [];
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse font-mono text-[12px]">
        <thead>
          <tr className="bg-surface-2 text-left text-[11px] text-subtle">
            <th className="px-2.5 py-1.5 font-medium">#</th>
            <th className="px-2.5 py-1.5 font-medium">Call</th>
            {output && <th className="px-2.5 py-1.5 font-medium">Expected</th>}
            {received && <th className="px-2.5 py-1.5 font-medium">Yours</th>}
          </tr>
        </thead>
        <tbody>
          {ops.map((op, i) => {
            const call = i === 0 ? `${op}(${(args[i] ?? []).map((a) => pyRepr(a)).join(", ")})` : `.${op}(${(args[i] ?? []).map((a) => pyRepr(a)).join(", ")})`;
            const mismatch = received && output && pyRepr(received[i]) !== pyRepr(output[i]);
            return (
              <tr key={i} className="border-t border-border">
                <td className="px-2.5 py-1 text-subtle">{i + 1}</td>
                <td className="px-2.5 py-1 text-fg">{call}</td>
                {output && <td className="px-2.5 py-1 text-muted">{i === 0 ? "—" : pyRepr(output[i])}</td>}
                {received && (
                  <td className={mismatch ? "bg-danger/10 px-2.5 py-1 text-danger" : "px-2.5 py-1 text-muted"}>
                    {i === 0 ? "—" : i < received.length ? pyRepr(received[i]) : "…"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
