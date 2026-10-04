import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import clsx from "clsx";
import { formatDuration } from "@/lib/format";

interface TimerState {
  running: boolean;
  startedAt: number | null;
  elapsed: number;
}

function load(key: string): TimerState {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw) as TimerState;
  } catch {
    // ignore
  }
  return { running: false, startedAt: null, elapsed: 0 };
}

/** Optional interview timer; state survives navigation within the session. */
export function Timer({ slug }: { slug: string }) {
  const key = `b75-timer-${slug}`;
  const [state, setState] = useState<TimerState>(() => load(key));
  const [, tick] = useState(0);

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [key, state]);

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.running]);

  const total = state.elapsed + (state.running && state.startedAt ? Date.now() - state.startedAt : 0);
  const toggle = () =>
    setState((s) => (s.running ? { running: false, startedAt: null, elapsed: s.elapsed + (Date.now() - (s.startedAt ?? Date.now())) } : { ...s, running: true, startedAt: Date.now() }));
  const reset = () => setState({ running: false, startedAt: null, elapsed: 0 });

  if (!state.running && total === 0) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted hover:bg-surface-2 hover:text-fg"
        title="Start an interview timer"
      >
        <TimerIcon className="size-3.5" /> Timer
      </button>
    );
  }
  return (
    <div className={clsx("inline-flex h-7 items-center gap-0.5 rounded-md border px-1", state.running ? "border-accent/40 bg-accent-soft" : "border-border")}>
      <span className="px-1 font-mono text-xs tabular-nums">{formatDuration(total)}</span>
      <button type="button" onClick={toggle} className="rounded p-1 text-muted hover:text-fg" aria-label={state.running ? "Pause timer" : "Resume timer"}>
        {state.running ? <Pause className="size-3" /> : <Play className="size-3" />}
      </button>
      <button type="button" onClick={reset} className="rounded p-1 text-muted hover:text-fg" aria-label="Reset timer">
        <RotateCcw className="size-3" />
      </button>
    </div>
  );
}
