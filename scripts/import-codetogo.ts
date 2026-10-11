/**
 * Imports the Python topics (method cards, quizzes, "complete the line" drills)
 * from a local checkout of the CodeToGo app into data/drills/<topic>.yaml.
 *
 *   npx tsx scripts/import-codetogo.ts ../codetogo
 *
 * Only the 12 imported topic files are (re)written; topics authored here
 * (e.g. templates.yaml, complexity.yaml) are left alone.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stringify } from "yaml";

const root = path.resolve(process.argv[2] ?? "../codetogo");
const contentDir = path.join(root, "src", "content", "python");

interface Topic {
  id: string;
  title: string;
  blurb: string;
  intro?: string;
  methods: Array<Record<string, unknown>>;
  quiz: Array<Record<string, unknown>>;
}

const { PY_TOPICS } = (await import(pathToFileURL(path.join(contentDir, "index.ts")).href)) as { PY_TOPICS: Topic[] };
const { DRILLS_BY_TOPIC } = (await import(pathToFileURL(path.join(contentDir, "drills", "index.ts")).href)) as {
  DRILLS_BY_TOPIC: Record<string, Array<Record<string, unknown>>>;
};

const outDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "data", "drills");
PY_TOPICS.forEach((t, i) => {
  const doc = {
    id: t.id,
    title: t.title,
    group: "Python",
    order: i + 1,
    blurb: t.blurb,
    ...(t.intro ? { intro: t.intro } : {}),
    methods: t.methods,
    quiz: t.quiz,
    drills: (DRILLS_BY_TOPIC[t.id] ?? []).map(({ topic: _t, ...d }) => d),
  };
  const header = `# Imported from CodeToGo (src/content/python/${t.id}.ts + drills/${t.id}.ts).\n# Re-run scripts/import-codetogo.ts to refresh; edits here will be overwritten.\n`;
  writeFileSync(path.join(outDir, `${t.id}.yaml`), header + stringify(doc, { lineWidth: 0, blockQuote: "literal" }));
  console.log(`${t.id}: ${t.methods.length} methods, ${t.quiz.length} quiz, ${(DRILLS_BY_TOPIC[t.id] ?? []).length} drills`);
});
