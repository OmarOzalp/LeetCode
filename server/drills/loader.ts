import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { DrillTopicSchema, PatternMapSchema, type DrillTopic, type PatternMap } from "../../shared/drillSchema.ts";
import type { DrillsResponse, PatternCard } from "../../shared/api.ts";
import { categoryName } from "../../shared/categories.ts";
import { DATA_DIR, getDataset } from "../problems/loader.ts";

export const DRILLS_DIR = path.join(DATA_DIR, "drills");
const PATTERN_FILE = "patterns.yaml";

export interface DrillIssue {
  file: string;
  message: string;
}

export function loadDrillTopics(): { topics: DrillTopic[]; issues: DrillIssue[] } {
  const issues: DrillIssue[] = [];
  const topics: DrillTopic[] = [];
  if (!existsSync(DRILLS_DIR)) return { topics, issues };
  for (const file of readdirSync(DRILLS_DIR).filter((f) => f.endsWith(".yaml") && f !== PATTERN_FILE)) {
    try {
      const raw = parseYaml(readFileSync(path.join(DRILLS_DIR, file), "utf8"));
      const parsed = DrillTopicSchema.safeParse(raw);
      if (!parsed.success) {
        issues.push({ file, message: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
        continue;
      }
      topics.push(parsed.data);
    } catch (e) {
      issues.push({ file, message: (e as Error).message });
    }
  }
  topics.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  // Ids must be unique across every topic because progress is keyed by them.
  const seen = new Map<string, string>();
  for (const t of topics) {
    const methodIds = new Set(t.methods.map((m) => m.id));
    for (const id of [...t.methods.map((m) => m.id), ...t.quiz.map((q) => q.id), ...t.drills.map((d) => d.id)]) {
      if (seen.has(id)) issues.push({ file: `${t.id}.yaml`, message: `duplicate id "${id}" (also in ${seen.get(id)})` });
      seen.set(id, t.id);
    }
    for (const d of t.drills) if (d.method && !methodIds.has(d.method)) issues.push({ file: `${t.id}.yaml`, message: `drill ${d.id} refers to unknown method ${d.method}` });
    for (const q of t.quiz) {
      if (q.answer >= q.options.length) issues.push({ file: `${t.id}.yaml`, message: `quiz ${q.id} answer index out of range` });
      if (q.method && !methodIds.has(q.method)) issues.push({ file: `${t.id}.yaml`, message: `quiz ${q.id} refers to unknown method ${q.method}` });
    }
  }
  return { topics, issues };
}

export function loadPatternMap(): PatternMap | null {
  const file = path.join(DRILLS_DIR, PATTERN_FILE);
  if (!existsSync(file)) return null;
  return PatternMapSchema.parse(parseYaml(readFileSync(file, "utf8")));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic shuffle so a card's options don't move around between visits. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let s = hash(seed);
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "Which technique fits?" cards generated from the Blind 75 problems. */
export function buildPatternCards(map: PatternMap | null): PatternCard[] {
  if (!map) return [];
  const ds = getDataset();
  const cards: PatternCard[] = [];
  for (const entry of map.problems) {
    const p = ds.problems.get(entry.slug);
    if (!p) continue;
    const excluded = new Set([entry.answer, ...entry.also]);
    const distractors = seededShuffle(
      map.labels.filter((l) => !excluded.has(l)),
      entry.slug,
    ).slice(0, 3);
    const options = seededShuffle([entry.answer, ...distractors], `${entry.slug}:options`);
    cards.push({
      id: `pattern-${entry.slug}`,
      slug: entry.slug,
      title: p.title,
      difficulty: p.difficulty,
      category: categoryName(p.category),
      prompt: p.description,
      options,
      answer: options.indexOf(entry.answer),
      also: entry.also,
      explanation: p.key_insight,
      approach: p.approach,
    });
  }
  return cards;
}

// ------------------------------------------------------------------ cached access with hot reload

let cache: { fp: string; value: DrillsResponse; issues: DrillIssue[] } | null = null;
let lastCheck = 0;

function fingerprint(): string {
  if (!existsSync(DRILLS_DIR)) return "none";
  return readdirSync(DRILLS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => `${f}:${statSync(path.join(DRILLS_DIR, f)).mtimeMs}`)
    .join("|");
}

export function getDrills(): { value: DrillsResponse; issues: DrillIssue[] } {
  const now = Date.now();
  if (cache && now - lastCheck < 1000) return cache;
  lastCheck = now;
  const fp = fingerprint();
  if (!cache || cache.fp !== fp) {
    const { topics, issues } = loadDrillTopics();
    let patterns: PatternCard[] = [];
    try {
      patterns = buildPatternCards(loadPatternMap());
    } catch (e) {
      issues.push({ file: PATTERN_FILE, message: (e as Error).message });
    }
    for (const i of issues) console.warn(`[drills] ${i.file}: ${i.message}`);
    cache = { fp, value: { topics, patterns }, issues };
  }
  return cache;
}

export function findDrill(id: string) {
  for (const t of getDrills().value.topics) {
    const d = t.drills.find((x) => x.id === id);
    if (d) return { topic: t, drill: d };
  }
  return null;
}
