import { create } from "zustand";
import type {
  AppSettings,
  CategoryInfo,
  DrillDay,
  DrillReviewRequest,
  DrillsResponse,
  HealthResponse,
  ProblemProgress,
  ProblemSummary,
  ProgressPatch,
} from "@shared/api";
import type { CardState } from "@shared/srs";
import { dayKey } from "@shared/srs";
import { api } from "./api";

export const EMPTY_PROGRESS: ProblemProgress = {
  status: "not_started",
  attempts: 0,
  failedAttempts: 0,
  everPassed: false,
  hintsRevealed: 0,
  solutionRevealed: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  editorFontSize: 14,
  sidebarCollapsed: false,
  confirmBeforeSolution: true,
  autoMarkSolved: true,
};

interface AppStore {
  ready: boolean;
  error: string | null;
  categories: CategoryInfo[];
  problems: ProblemSummary[];
  bySlug: Record<string, ProblemSummary>;
  progress: Record<string, ProblemProgress>;
  settings: AppSettings;
  health: HealthResponse | null;
  /** Spaced-repetition state per drill card. */
  drills: Record<string, CardState>;
  drillDays: Record<string, DrillDay>;
  /** Drill content, loaded the first time a drills page opens. */
  drillContent: DrillsResponse | null;
  loadDrills: () => Promise<DrillsResponse>;
  recordDrill: (req: DrillReviewRequest) => Promise<void>;
  recordSprint: (score: number) => Promise<void>;
  resetDrills: () => Promise<void>;
  init: () => Promise<void>;
  /** Replace a problem's progress with the server's authoritative copy. */
  setProgress: (slug: string, p: ProblemProgress) => void;
  /** Optimistically apply a patch, then sync with the server. */
  patchProgress: (slug: string, patch: ProgressPatch) => Promise<ProblemProgress | null>;
  resetProgress: (slug: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  reloadState: () => Promise<void>;
}

function applyTheme(theme: AppSettings["theme"]) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("b75-theme", theme);
  } catch {
    // storage may be unavailable
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  ready: false,
  error: null,
  categories: [],
  problems: [],
  bySlug: {},
  progress: {},
  settings: DEFAULT_SETTINGS,
  health: null,
  drills: {},
  drillDays: {},
  drillContent: null,

  loadDrills: async () => {
    const existing = get().drillContent;
    if (existing) return existing;
    const content = await api.drills();
    set({ drillContent: content });
    return content;
  },

  recordDrill: async (req) => {
    try {
      const res = await api.reviewDrill(req);
      set((s) => ({ drills: { ...s.drills, [req.cardId]: res.card }, drillDays: { ...s.drillDays, [dayKey(new Date())]: res.day } }));
    } catch (e) {
      console.error(e);
    }
  },

  recordSprint: async (score) => {
    try {
      const day = await api.recordSprint(score);
      set((s) => ({ drillDays: { ...s.drillDays, [dayKey(new Date())]: day } }));
    } catch (e) {
      console.error(e);
    }
  },

  resetDrills: async () => {
    await api.resetDrills();
    set({ drills: {}, drillDays: {} });
  },

  init: async () => {
    try {
      const [list, state, health] = await Promise.all([api.problems(), api.state(), api.health()]);
      applyTheme(state.settings.theme);
      set({
        ready: true,
        error: null,
        categories: list.categories,
        problems: list.problems,
        bySlug: Object.fromEntries(list.problems.map((p) => [p.slug, p])),
        progress: state.problems,
        settings: state.settings,
        drills: state.drills ?? {},
        drillDays: state.drillDays ?? {},
        health,
      });
    } catch (e) {
      set({ error: (e as Error).message, ready: false });
    }
  },

  reloadState: async () => {
    const state = await api.state();
    applyTheme(state.settings.theme);
    set({ progress: state.problems, settings: state.settings, drills: state.drills ?? {}, drillDays: state.drillDays ?? {} });
  },

  setProgress: (slug, p) => set((s) => ({ progress: { ...s.progress, [slug]: p } })),

  patchProgress: async (slug, patch) => {
    const prev = get().progress[slug] ?? EMPTY_PROGRESS;
    set((s) => ({ progress: { ...s.progress, [slug]: { ...prev, ...patch } as ProblemProgress } }));
    try {
      const next = await api.patchProgress(slug, patch);
      get().setProgress(slug, next);
      return next;
    } catch (e) {
      set((s) => ({ progress: { ...s.progress, [slug]: prev } }));
      console.error(e);
      return null;
    }
  },

  resetProgress: async (slug) => {
    const next = await api.resetProgress(slug);
    get().setProgress(slug, next);
  },

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    if (patch.theme) applyTheme(patch.theme);
    set({ settings: next });
    api.patchSettings(patch).catch((e) => console.error(e));
  },
}));

export function useProgress(slug: string | undefined): ProblemProgress {
  return useAppStore((s) => (slug ? s.progress[slug] : undefined) ?? EMPTY_PROGRESS);
}
