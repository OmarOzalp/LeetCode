import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AppSettings, AppState, DrillDay, DrillReviewRequest, DrillReviewResponse, ProblemProgress, ProgressPatch, RunResponse } from "../../shared/api.ts";
import { dayKey, review, type CardState } from "../../shared/srs.ts";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  editorFontSize: 14,
  sidebarCollapsed: false,
  confirmBeforeSolution: true,
  autoMarkSolved: true,
};

export function emptyProgress(): ProblemProgress {
  return {
    status: "not_started",
    attempts: 0,
    failedAttempts: 0,
    everPassed: false,
    hintsRevealed: 0,
    solutionRevealed: false,
  };
}

const MAX_HISTORY = 50;

function normalizeState(raw: Partial<AppState>): AppState {
  const problems: Record<string, ProblemProgress> = {};
  for (const [slug, p] of Object.entries(raw.problems ?? {})) problems[slug] = { ...emptyProgress(), ...p };
  return {
    version: 1,
    problems,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    drills: { ...(raw.drills ?? {}) },
    drillDays: { ...(raw.drillDays ?? {}) },
  };
}
const MAX_CUSTOM_TESTS = 10;
const BACKUPS_TO_KEEP = 7;

/**
 * Persists all user progress in a single JSON file. Writes are debounced and
 * atomic (write to a temp file, then rename) so a crash can't corrupt it, and a
 * dated backup is kept for each day the app is started.
 */
export class StateStore {
  private state: AppState;
  private timer: NodeJS.Timeout | null = null;
  readonly file: string;

  constructor(readonly dir: string) {
    this.file = path.join(dir, "state.json");
    mkdirSync(dir, { recursive: true });
    this.state = this.load();
    this.backup();
  }

  private load(): AppState {
    if (!existsSync(this.file)) return normalizeState({});
    try {
      return normalizeState(JSON.parse(readFileSync(this.file, "utf8")) as Partial<AppState>);
    } catch (e) {
      const corrupt = `${this.file}.corrupt-${Date.now()}`;
      copyFileSync(this.file, corrupt);
      console.error(`[state] Could not parse ${this.file} (${(e as Error).message}). A copy was saved to ${corrupt}; starting fresh.`);
      return normalizeState({});
    }
  }

  private backup() {
    if (!existsSync(this.file)) return;
    const dir = path.join(this.dir, "backups");
    mkdirSync(dir, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const target = path.join(dir, `state-${today}.json`);
    if (!existsSync(target)) copyFileSync(this.file, target);
    const old = readdirSync(dir)
      .filter((f) => /^state-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .slice(0, -BACKUPS_TO_KEEP);
    for (const f of old) unlinkSync(path.join(dir, f));
  }

  private scheduleSave() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 150);
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    renameSync(tmp, this.file);
  }

  get(): AppState {
    return this.state;
  }

  problem(slug: string): ProblemProgress {
    return this.state.problems[slug] ?? emptyProgress();
  }

  private mutate(slug: string, fn: (p: ProblemProgress) => void): ProblemProgress {
    const p = { ...this.problem(slug) };
    fn(p);
    this.state.problems[slug] = p;
    this.scheduleSave();
    return p;
  }

  patchProblem(slug: string, patch: ProgressPatch): ProblemProgress {
    return this.mutate(slug, (p) => {
      const now = new Date().toISOString();
      if (patch.code !== undefined && patch.code !== p.code) {
        p.code = patch.code;
        p.codeUpdatedAt = now;
      }
      if (patch.status !== undefined && patch.status !== p.status) {
        p.status = patch.status;
        p.statusChangedAt = now;
        if (patch.status === "solved") p.solvedAt ??= now;
      }
      if (patch.hintsRevealed !== undefined) p.hintsRevealed = Math.max(p.hintsRevealed, patch.hintsRevealed);
      if (patch.solutionRevealed && !p.solutionRevealed) {
        p.solutionRevealed = true;
        p.solutionRevealedAt = now;
      }
      if (patch.confidence !== undefined) p.confidence = patch.confidence;
      if (patch.notes !== undefined) p.notes = patch.notes;
      if (patch.customTests !== undefined) p.customTests = patch.customTests.slice(0, MAX_CUSTOM_TESTS);
      if (patch.timeSpentMs !== undefined) p.timeSpentMs = Math.max(0, patch.timeSpentMs);
      // Opening the editor and typing counts as starting the problem.
      if (patch.code !== undefined && p.status === "not_started") {
        p.status = "attempted";
        p.statusChangedAt = now;
      }
    });
  }

  /** Records a full test run (all tests) as an attempt. */
  recordRun(slug: string, code: string, res: RunResponse): ProblemProgress {
    const autoSolve = this.state.settings.autoMarkSolved;
    return this.mutate(slug, (p) => {
      const now = new Date().toISOString();
      if (code !== p.code) {
        p.code = code;
        p.codeUpdatedAt = now;
      }
      p.attempts += 1;
      p.lastAttemptAt = now;
      p.lastResult = { passed: res.passed, total: res.total, allPassed: res.allPassed };
      p.history = [...(p.history ?? []), { at: now, passed: res.passed, total: res.total, allPassed: res.allPassed }].slice(-MAX_HISTORY);
      if (res.allPassed) {
        p.everPassed = true;
        p.solvedAt = now;
        p.firstSolvedAt ??= now;
        if (autoSolve && (p.status === "not_started" || p.status === "attempted")) {
          p.status = "solved";
          p.statusChangedAt = now;
        }
      } else {
        p.failedAttempts += 1;
        if (p.status === "not_started") {
          p.status = "attempted";
          p.statusChangedAt = now;
        }
      }
    });
  }

  resetProblem(slug: string): ProblemProgress {
    delete this.state.problems[slug];
    this.scheduleSave();
    return emptyProgress();
  }

  /** Record one drill answer: updates the card's spaced-repetition state and today's tally. */
  recordDrill(req: DrillReviewRequest, now = new Date()): DrillReviewResponse {
    const fastSeconds = req.kind === "drill" ? 10 : 6;
    const card: CardState = review(this.state.drills[req.cardId], { correct: req.correct, ms: req.ms, assisted: req.assisted, fastSeconds }, now);
    this.state.drills[req.cardId] = card;
    const key = dayKey(now);
    const prev: DrillDay = this.state.drillDays[key] ?? { reviewed: 0, correct: 0, ms: 0 };
    const day: DrillDay = {
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (req.correct ? 1 : 0),
      ms: prev.ms + Math.max(0, Math.min(req.ms, 120_000)),
    };
    this.state.drillDays[key] = day;
    this.scheduleSave();
    return { card, day };
  }

  /** Store a speed-round score if it beats today's best. */
  recordSprint(score: number, now = new Date()): DrillDay {
    const key = dayKey(now);
    const prev: DrillDay = this.state.drillDays[key] ?? { reviewed: 0, correct: 0, ms: 0 };
    const day = { ...prev, bestSprint: Math.max(prev.bestSprint ?? 0, score) };
    this.state.drillDays[key] = day;
    this.scheduleSave();
    return day;
  }

  resetDrills() {
    this.state.drills = {};
    this.state.drillDays = {};
    this.scheduleSave();
  }

  patchSettings(patch: Partial<AppSettings>): AppSettings {
    this.state.settings = { ...this.state.settings, ...patch };
    this.scheduleSave();
    return this.state.settings;
  }

  /** Replace everything (import). The previous state is backed up first. */
  replace(next: AppState) {
    if (existsSync(this.file)) copyFileSync(this.file, path.join(this.dir, `state.before-import-${Date.now()}.json`));
    this.state = normalizeState(next);
    this.flush();
  }
}
