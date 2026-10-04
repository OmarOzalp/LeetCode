import { Link, useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Code2, GitCompareArrows, ListChecks, Shuffle } from "lucide-react";
import clsx from "clsx";
import type { ProblemDetail, ProblemStatus } from "@shared/api";
import { STATUSES } from "@shared/api";
import { DifficultyBadge, STATUS_LABELS, StatusIcon } from "@/components/ui/Badges";
import { Popover } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Tabs";
import { IconButton } from "@/components/ui/Button";
import { useAppStore, useProgress } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { randomUnsolved } from "@/lib/stats";
import { ConfidencePicker } from "./ConfidencePicker";
import { Timer } from "./Timer";

export type WorkspaceView = "workspace" | "compare";

export function ProblemHeader({
  problem,
  view,
  onView,
  onResetProgress,
}: {
  problem: ProblemDetail;
  view: WorkspaceView;
  onView: (v: WorkspaceView) => void;
  onResetProgress: () => void;
}) {
  const navigate = useNavigate();
  const problems = useAppStore((s) => s.problems);
  const allProgress = useAppStore((s) => s.progress);
  const goRandom = () => {
    const p = randomUnsolved(problems, allProgress, problem.slug);
    if (p) navigate(`/problems/${p.slug}`);
  };
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-3">
      <Link to="/" className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted hover:bg-surface-2 hover:text-fg" title="Back to problem list">
        <ListChecks className="size-3.5" /> Problems
      </Link>
      <div className="flex items-center">
        <IconButton label="Previous problem" disabled={!problem.prev} onClick={() => problem.prev && navigate(`/problems/${problem.prev}`)}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton label="Next problem" disabled={!problem.next} onClick={() => problem.next && navigate(`/problems/${problem.next}`)}>
          <ChevronRight className="size-4" />
        </IconButton>
        <IconButton label="Random unsolved problem" onClick={goRandom}>
          <Shuffle className="size-3.5" />
        </IconButton>
      </div>
      <div className="mx-1 h-5 w-px bg-border" />
      <h1 className="min-w-0 truncate text-[13px] font-semibold">{problem.title}</h1>
      <DifficultyBadge difficulty={problem.difficulty} className="hidden sm:inline-flex" />

      <div className="ml-auto flex items-center gap-2">
        <Segmented<WorkspaceView>
          value={view}
          onChange={onView}
          items={[
            { id: "workspace", label: <span className="inline-flex items-center gap-1.5"><Code2 className="size-3.5" />Solve</span> },
            { id: "compare", label: <span className="inline-flex items-center gap-1.5"><GitCompareArrows className="size-3.5" />Compare</span> },
          ]}
        />
        <Timer slug={problem.slug} />
        <ProgressMenu slug={problem.slug} onReset={onResetProgress} />
      </div>
    </header>
  );
}

function ProgressMenu({ slug, onReset }: { slug: string; onReset: () => void }) {
  const progress = useProgress(slug);
  const patch = useAppStore((s) => s.patchProgress);
  const setStatus = (status: ProblemStatus) => void patch(slug, { status });
  return (
    <Popover
      width={300}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Problem status"
          className={clsx(
            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
            open ? "border-border-strong bg-surface-2" : "border-border hover:bg-surface-2",
          )}
        >
          <StatusIcon status={progress.status} className="!size-4" />
          {STATUS_LABELS[progress.status]}
          <ChevronDown className="size-3 text-subtle" />
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-2 p-1.5">
          <div className="text-[11px] font-medium tracking-wide text-subtle uppercase">Status</div>
          <div className="grid grid-cols-2 gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={clsx(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                  progress.status === s ? "border-accent bg-accent-soft text-fg" : "border-border text-muted hover:text-fg",
                )}
              >
                <StatusIcon status={s} className="!size-4" />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="mt-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Confidence</div>
          <ConfidencePicker value={progress.confidence} onChange={(confidence) => void patch(slug, { confidence })} />
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-surface-2/60 px-2.5 py-2 text-xs">
            <dt className="text-subtle">Attempts</dt>
            <dd className="text-right tabular-nums">
              {progress.attempts}
              {progress.failedAttempts ? <span className="text-subtle"> ({progress.failedAttempts} failed)</span> : null}
            </dd>
            <dt className="text-subtle">Last attempt</dt>
            <dd className="text-right">{relativeTime(progress.lastAttemptAt)}</dd>
            <dt className="text-subtle">Tests passed</dt>
            <dd className="text-right">{progress.everPassed ? "Yes" : "Not yet"}</dd>
            <dt className="text-subtle">Hints used</dt>
            <dd className="text-right tabular-nums">{progress.hintsRevealed}</dd>
            <dt className="text-subtle">Solution revealed</dt>
            <dd className="text-right">{progress.solutionRevealed ? "Yes" : "No"}</dd>
          </dl>
          <button type="button" onClick={onReset} className="self-start rounded px-1 py-0.5 text-[11px] text-subtle hover:text-danger">
            Reset progress for this problem…
          </button>
        </div>
      )}
    </Popover>
  );
}
