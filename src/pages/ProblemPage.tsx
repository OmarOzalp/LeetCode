import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import clsx from "clsx";
import { AlertTriangle, BookOpen, CheckCircle2, Eye, GitCompareArrows, Lightbulb, Minus, NotebookPen, Play, Plus, RotateCcw, Send } from "lucide-react";
import type { ProblemDetail, RunMode, RunResponse } from "@shared/api";
import { useProblemDetail } from "@/hooks/useProblemDetail";
import { useCodeDraft, type SaveStatus } from "@/hooks/useCodeDraft";
import { MOD, useHotkeys } from "@/hooks/useHotkeys";
import { api } from "@/lib/api";
import { useAppStore, useProgress } from "@/lib/store";
import { PageSpinner } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, Kbd } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import { ProblemHeader, type WorkspaceView } from "@/components/problem/ProblemHeader";
import { DescriptionPanel } from "@/components/problem/DescriptionPanel";
import { HintsPanel } from "@/components/problem/HintsPanel";
import { RevealGate, SolutionPanel } from "@/components/problem/SolutionPanel";
import { NotesPanel } from "@/components/problem/NotesPanel";
import { CodeEditor, type CodeEditorHandle, type EditorMarker } from "@/components/problem/CodeEditor";
import { ConsolePanel, type ConsoleTab, type RunState } from "@/components/problem/ConsolePanel";
import { ConfidencePicker } from "@/components/problem/ConfidencePicker";
import { CompareView } from "@/components/compare/CompareView";

export default function ProblemPage() {
  const { slug } = useParams();
  const { data, error } = useProblemDetail(slug);
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<AlertTriangle className="size-7" />} title="Couldn't load this problem">
          {error}
        </EmptyState>
      </div>
    );
  }
  if (!data || data.slug !== slug) return <PageSpinner />;
  return <Workspace key={data.slug} problem={data} />;
}

type LeftTab = "description" | "hints" | "solution" | "notes";

function Workspace({ problem }: { problem: ProblemDetail }) {
  const slug = problem.slug;
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const view: WorkspaceView = sp.get("view") === "compare" ? "compare" : "workspace";
  const setView = (v: WorkspaceView) => {
    void draft.flush();
    setSp(v === "compare" ? { view: "compare" } : {}, { replace: true });
  };

  const progress = useProgress(slug);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const patch = useAppStore((s) => s.patchProgress);
  const setProgress = useAppStore((s) => s.setProgress);
  const resetProgress = useAppStore((s) => s.resetProgress);

  const draft = useCodeDraft(slug, problem.starter_code);
  const editor = useRef<CodeEditorHandle | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcases");
  const [run, setRun] = useState<RunState>({ running: null, last: null, lastCustom: null, error: null });
  const [markers, setMarkers] = useState<EditorMarker[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmResetProgress, setConfirmResetProgress] = useState(false);
  const runningRef = useRef(false);

  const revealHint = useCallback(
    (n: number) => {
      void patch(slug, { hintsRevealed: Math.min(n, problem.hints.length) });
      setLeftTab("hints");
    },
    [patch, slug, problem.hints.length],
  );
  const revealSolution = useCallback(() => void patch(slug, { solutionRevealed: true }), [patch, slug]);

  const openSolution = () => {
    setLeftTab("solution");
    if (!settings.confirmBeforeSolution && !progress.solutionRevealed) revealSolution();
  };

  const markersFrom = (res: RunResponse): EditorMarker[] => {
    if (res.loadError?.line) return [{ line: res.loadError.line, column: res.loadError.column, message: `${res.loadError.type}: ${res.loadError.message}`, severity: "error" }];
    const bad = res.results.find((r) => r.error?.line);
    if (bad?.error?.line) return [{ line: bad.error.line, message: `${bad.error.type}: ${bad.error.message} (${bad.name})`, severity: "error" }];
    return [];
  };

  const runTests = useCallback(
    async (mode: Exclude<RunMode, "custom">) => {
      if (runningRef.current) return;
      runningRef.current = true;
      const code = draft.code;
      setRun((r) => ({ ...r, running: mode, error: null }));
      setConsoleTab("results");
      try {
        const res = await api.run(slug, code, mode);
        if (res.progress) {
          setProgress(slug, res.progress);
          draft.markSaved(code);
        }
        setRun((r) => ({ ...r, running: null, last: res }));
        setMarkers(markersFrom(res));
      } catch (e) {
        setRun((r) => ({ ...r, running: null, error: (e as Error).message }));
      } finally {
        runningRef.current = false;
      }
    },
    [draft, slug, setProgress],
  );

  const runCustom = useCallback(
    async (values: Record<string, string>[]) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setRun((r) => ({ ...r, running: "custom", error: null }));
      try {
        const res = await api.run(slug, draft.code, "custom", values.map((v) => ({ values: v })));
        setRun((r) => ({ ...r, running: null, lastCustom: res }));
        setMarkers(markersFrom(res));
      } catch (e) {
        toast.error((e as Error).message);
        setRun((r) => ({ ...r, running: null }));
      } finally {
        runningRef.current = false;
      }
    },
    [draft.code, slug],
  );

  const save = useCallback(async () => {
    await draft.flush();
    toast.success("Saved");
  }, [draft]);

  useHotkeys({
    "mod+enter": () => void runTests("all"),
    "mod+'": () => void runTests("examples"),
    "mod+s": () => void save(),
  });

  const onLine = (line: number) => editor.current?.revealLine(line);

  const justPassed = run.last?.mode === "all" && run.last.allPassed;
  const successSlot = justPassed ? (
    <SuccessBanner
      slug={slug}
      onCompare={() => setView("compare")}
      onNext={problem.next ? () => navigate(`/problems/${problem.next}`) : undefined}
    />
  ) : null;

  const leftTabs = useMemo(
    () => [
      { id: "description" as const, label: "Description", icon: <BookOpen className="size-3.5" /> },
      {
        id: "hints" as const,
        label: "Hints",
        icon: <Lightbulb className="size-3.5" />,
        badge: <span className="text-[11px] text-subtle tabular-nums">{Math.min(progress.hintsRevealed, problem.hints.length)}/{problem.hints.length}</span>,
      },
      { id: "solution" as const, label: "Solution", icon: <Eye className="size-3.5" /> },
      { id: "notes" as const, label: "Notes", icon: <NotebookPen className="size-3.5" />, badge: progress.notes?.trim() ? <span className="size-1.5 rounded-full bg-accent" /> : undefined },
    ],
    [progress.hintsRevealed, progress.notes, problem.hints.length],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ProblemHeader problem={problem} view={view} onView={setView} onResetProgress={() => setConfirmResetProgress(true)} />
      {view === "compare" ? (
        <CompareView problem={problem} code={draft.code} onBack={() => setView("workspace")} onHint={() => { setView("workspace"); revealHint(progress.hintsRevealed + 1); }} />
      ) : (
        <PanelGroup direction="horizontal" autoSaveId="b75-workspace-h" className="min-h-0 flex-1">
          <Panel defaultSize={42} minSize={24} className="flex min-w-0 flex-col">
            <div className="flex h-10 shrink-0 items-center border-b border-border px-2">
              <Tabs<LeftTab> size="sm" items={leftTabs} value={leftTab} onChange={(t) => (t === "solution" ? openSolution() : setLeftTab(t))} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {leftTab === "description" && <DescriptionPanel problem={problem} />}
              {leftTab === "hints" && (
                <HintsPanel problem={problem} revealed={progress.hintsRevealed} onReveal={revealHint} onShowSolution={openSolution} />
              )}
              {leftTab === "solution" &&
                (progress.solutionRevealed ? (
                  <SolutionPanel problem={problem} />
                ) : (
                  <RevealGate
                    hintsRevealed={Math.min(progress.hintsRevealed, problem.hints.length)}
                    hintsTotal={problem.hints.length}
                    onHint={() => revealHint(progress.hintsRevealed + 1)}
                    onReveal={revealSolution}
                  />
                ))}
              {leftTab === "notes" && <NotesPanel slug={slug} />}
            </div>
          </Panel>
          <PanelResizeHandle />
          <Panel minSize={35} className="min-w-0">
            <PanelGroup direction="vertical" autoSaveId="b75-workspace-v">
              <Panel defaultSize={62} minSize={20} className="flex min-h-0 flex-col">
                <EditorToolbar
                  status={draft.status}
                  running={run.running}
                  fontSize={settings.editorFontSize}
                  onFont={(d) => updateSettings({ editorFontSize: Math.max(11, Math.min(22, settings.editorFontSize + d)) })}
                  onReset={() => setConfirmReset(true)}
                  onRunExamples={() => void runTests("examples")}
                  onRunAll={() => void runTests("all")}
                />
                <div className="min-h-0 flex-1 bg-code-bg">
                  <CodeEditor
                    value={draft.code}
                    onChange={(v) => {
                      draft.setCode(v);
                      if (markers.length) setMarkers([]);
                    }}
                    onRunAll={() => void runTests("all")}
                    onRunExamples={() => void runTests("examples")}
                    onSave={() => void save()}
                    markers={markers}
                    handleRef={editor}
                  />
                </div>
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={38} minSize={10} className="min-h-0 bg-surface/40">
                <ConsolePanel problem={problem} tab={consoleTab} onTab={setConsoleTab} run={run} onRunCustom={(v) => void runCustom(v)} onLine={onLine} successSlot={successSlot} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset to starter code?"
        confirmLabel="Reset code"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          draft.setCode(problem.starter_code);
          void draft.flush();
          setMarkers([]);
          setConfirmReset(false);
          toast.info("Code reset to the starter template");
        }}
      >
        Your current code for <strong className="text-fg">{problem.title}</strong> will be replaced with the starter template. This can't be undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmResetProgress}
        title="Reset progress for this problem?"
        confirmLabel="Reset progress"
        danger
        onCancel={() => setConfirmResetProgress(false)}
        onConfirm={async () => {
          setConfirmResetProgress(false);
          await resetProgress(slug);
          draft.setCode(problem.starter_code);
          setRun({ running: null, last: null, lastCustom: null, error: null });
          setMarkers([]);
          toast.info("Progress reset");
        }}
      >
        This clears the status, attempt history, confidence, hints, notes, custom tests and saved code for this problem.
      </ConfirmDialog>
    </div>
  );
}

const SAVE_TEXT: Record<SaveStatus, string> = { saved: "Saved", dirty: "Unsaved changes", saving: "Saving…", error: "Save failed — is the server running?" };

function EditorToolbar({
  status,
  running,
  fontSize,
  onFont,
  onReset,
  onRunExamples,
  onRunAll,
}: {
  status: SaveStatus;
  running: RunState["running"];
  fontSize: number;
  onFont: (delta: number) => void;
  onReset: () => void;
  onRunExamples: () => void;
  onRunAll: () => void;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-2">
      <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[11px] text-muted">Python 3</span>
      <span className={clsx("text-[11px]", status === "error" ? "text-danger" : "text-subtle")}>{SAVE_TEXT[status]}</span>
      <div className="ml-auto flex items-center gap-1">
        <div className="mr-1 hidden items-center rounded-md border border-border md:flex" title="Editor font size">
          <button type="button" className="p-1 text-muted hover:text-fg" onClick={() => onFont(-1)} aria-label="Decrease font size">
            <Minus className="size-3" />
          </button>
          <span className="w-6 text-center text-[11px] text-muted tabular-nums">{fontSize}</span>
          <button type="button" className="p-1 text-muted hover:text-fg" onClick={() => onFont(1)} aria-label="Increase font size">
            <Plus className="size-3" />
          </button>
        </div>
        <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={onReset} title="Reset to starter code">
          <span className="hidden lg:inline">Reset</span>
        </Button>
        <Button size="sm" icon={<Play className="size-3.5" />} onClick={onRunExamples} loading={running === "examples"} disabled={!!running} title={`Run the examples only (${MOD}+')`}>
          Run Examples
        </Button>
        <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} onClick={onRunAll} loading={running === "all"} disabled={!!running} title={`Run all tests incl. hidden edge cases (${MOD}+Enter)`}>
          Run Tests
          <span className="ml-1 hidden items-center gap-0.5 opacity-80 xl:inline-flex">
            <Kbd>{MOD}</Kbd>
            <Kbd>↵</Kbd>
          </span>
        </Button>
      </div>
    </div>
  );
}

function SuccessBanner({ slug, onCompare, onNext }: { slug: string; onCompare: () => void; onNext?: () => void }) {
  const progress = useProgress(slug);
  const patch = useAppStore((s) => s.patchProgress);
  return (
    <div className="animate-fade-in rounded-xl border border-success/30 bg-success/[0.07] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="size-5 text-success" />
        <span className="text-[14px] font-semibold">All tests passed</span>
        <span className="text-xs text-muted">
          {progress.status === "solved" ? "Marked as solved." : progress.status === "review" ? "Status is still “Review”." : ""}
        </span>
        <div className="ml-auto flex gap-1.5">
          {progress.status !== "solved" && (
            <Button size="sm" variant="success" onClick={() => void patch(slug, { status: "solved" })}>
              Mark as solved
            </Button>
          )}
          <Button size="sm" icon={<GitCompareArrows className="size-3.5" />} onClick={onCompare}>
            Compare with optimal
          </Button>
          {onNext && (
            <Button size="sm" variant="ghost" onClick={onNext}>
              Next problem →
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-xs text-muted">How confident are you with this problem?</div>
        <ConfidencePicker value={progress.confidence} onChange={(confidence) => void patch(slug, { confidence })} />
      </div>
    </div>
  );
}
