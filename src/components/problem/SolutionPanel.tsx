import { useState } from "react";
import { ChevronDown, Eye, Lightbulb, Sparkles, Star } from "lucide-react";
import clsx from "clsx";
import type { ProblemDetail } from "@shared/api";
import type { Alternative } from "@shared/problemSchema";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ComplexityPill } from "@/components/ui/Badges";

export function RevealGate({
  hintsRevealed,
  hintsTotal,
  onReveal,
  onHint,
  what = "the optimal solution",
}: {
  hintsRevealed: number;
  hintsTotal: number;
  onReveal: () => void;
  onHint: () => void;
  what?: string;
}) {
  const hintsLeft = hintsTotal - hintsRevealed;
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Eye className="size-5" />
        </div>
        <h2 className="text-[15px] font-semibold">Reveal {what}?</h2>
        <p className="mt-1.5 text-[13px] text-muted">
          {hintsLeft > 0
            ? `You've used ${hintsRevealed} of ${hintsTotal} hints. Trying another hint first usually teaches more than reading the answer.`
            : "You've seen every hint. Reading the solution is a good next step — then try to re-implement it without looking."}
        </p>
        <p className="mt-2 text-xs text-subtle">Revealing is recorded so the Review page can resurface this problem later.</p>
        <div className="mt-5 flex justify-center gap-2">
          {hintsLeft > 0 && (
            <Button icon={<Lightbulb className="size-3.5" />} onClick={onHint}>
              Try Hint {hintsRevealed + 1}
            </Button>
          )}
          <Button variant={hintsLeft > 0 ? "ghost" : "primary"} icon={<Eye className="size-3.5" />} onClick={onReveal}>
            Reveal solution
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SolutionPanel({ problem }: { problem: ProblemDetail }) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold">{problem.approach}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">
          <Star className="size-3" /> Preferred interview solution
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <ComplexityPill label="Time" value={problem.time_complexity} />
        <ComplexityPill label="Space" value={problem.space_complexity} />
      </div>

      <div className="mt-4 flex gap-2.5 rounded-lg border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-[13px]">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <span className="font-semibold">Key insight. </span>
          {problem.key_insight}
        </div>
      </div>

      <Markdown className="mt-4">{problem.explanation}</Markdown>

      <CodeBlock code={problem.optimal_solution} title={`Python · ${problem.approach}`} className="mt-4" lineNumbers />

      <h3 className="mt-6 mb-2 text-[13px] font-semibold">Why this complexity?</h3>
      <Markdown className="text-[13.5px]">{problem.complexity_explanation}</Markdown>
      {(problem.data_structures.length > 0 || problem.passes) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          {problem.data_structures.length > 0 && (
            <span>
              <span className="text-subtle">Data structures: </span>
              {problem.data_structures.join(", ")}
            </span>
          )}
          {problem.passes && (
            <span>
              <span className="text-subtle">Passes: </span>
              {problem.passes}
            </span>
          )}
        </div>
      )}

      {problem.alternatives.length > 0 && (
        <>
          <h3 className="mt-7 mb-2 text-[13px] font-semibold">Other approaches</h3>
          <div className="flex flex-col gap-2">
            {problem.alternatives.map((alt, i) => (
              <AlternativeCard key={i} alt={alt} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AlternativeCard({ alt }: { alt: Alternative }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2/60"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">{alt.name}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <ComplexityPill label="Time" value={alt.time_complexity} />
            <ComplexityPill label="Space" value={alt.space_complexity} />
          </span>
        </span>
        <ChevronDown className={clsx("size-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border px-3.5 py-3">
          <Markdown className="text-[13.5px]">{alt.explanation}</Markdown>
          <div className="mt-3 rounded-md border border-border bg-surface-2/60 px-3 py-2 text-[13px] text-muted">
            <span className="font-semibold text-fg">Tradeoff: </span>
            {alt.tradeoff}
          </div>
          <CodeBlock code={alt.code} title={`Python · ${alt.name}`} className="mt-3" />
        </div>
      )}
    </div>
  );
}
