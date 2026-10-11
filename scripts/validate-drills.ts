/**
 * Validates drill content in data/drills:
 *   - schema, unique ids, method references
 *   - every method card's example prints exactly its `output`
 *   - every drill's answer (and each `accept`) passes its check in Python
 *   - every decoy FAILS its check (so multiple choice is meaningful)
 *   - "what does this print?" quiz questions match the real output (warning)
 *   - the pattern-recognition map covers the Blind 75 with known labels
 *
 *   npm run validate:drills
 *   npm run validate:drills -- templates complexity   # selected topics
 */
import { drillCheckExpr, drillProgram, type DrillTopic } from "../shared/drillSchema.ts";
import { loadDrillTopics, loadPatternMap } from "../server/drills/loader.ts";
import { loadDataset } from "../server/problems/loader.ts";
import { runDrillBatch, type DrillRunItem } from "../server/runner/judge.ts";

const selected = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function normOut(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .trim();
}

async function validateTopic(t: DrillTopic): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const items: DrillRunItem[] = [];
  const expect = new Map<string, { want: "pass" | "fail" | "output"; output?: string; label: string }>();

  for (const m of t.methods) {
    const key = `method:${m.id}`;
    items.push({ key, kind: "snippet", code: m.example });
    expect.set(key, { want: "output", output: m.output, label: `method ${m.id}` });
  }
  for (const d of t.drills) {
    const fills: Array<[string, "pass" | "fail"]> = [
      [d.answer, "pass"],
      ...(d.accept ?? []).map((a) => [a, "pass"] as [string, "pass"]),
      ...d.decoys.map((a) => [a, "fail"] as [string, "fail"]),
    ];
    fills.forEach(([fill, want], i) => {
      const key = `drill:${d.id}:${i}`;
      items.push({ key, kind: "drill", setup: d.setup, code: drillProgram(d, fill), show: d.show, check: drillCheckExpr(d) });
      expect.set(key, { want, label: `drill ${d.id} ${want === "pass" ? "answer" : "decoy"} \`${fill}\`` });
    });
    if ([d.answer, ...(d.accept ?? [])].some((a) => d.decoys.includes(a))) errors.push(`drill ${d.id}: a decoy equals an accepted answer`);
  }
  for (const q of t.quiz) {
    if (new Set(q.options).size !== q.options.length) errors.push(`quiz ${q.id}: duplicate options`);
    if (q.code && /print|output/i.test(q.question)) {
      const key = `quiz:${q.id}`;
      items.push({ key, kind: "snippet", code: q.code });
      expect.set(key, { want: "output", output: q.options[q.answer], label: `quiz ${q.id}` });
    }
  }

  const results = await runDrillBatch(items, 4);
  for (const r of results) {
    const e = expect.get(r.key)!;
    if (e.want === "output" && r.key.startsWith("quiz:")) {
      // Quiz options are often abbreviated (or name the error the code raises), so only warn.
      const want = normOut(e.output ?? "");
      const ok = r.error ? want.includes(r.error.type) : normOut(r.stdout) === want;
      if (!ok) warnings.push(`${e.label}: real output ${JSON.stringify(r.error ? r.error.type : normOut(r.stdout)).slice(0, 120)} vs answer ${JSON.stringify(want).slice(0, 120)}`);
    } else if (e.want === "output") {
      const got = normOut(r.stdout);
      const want = normOut(e.output ?? "");
      if (r.error) errors.push(`${e.label}: raised ${r.error.type}: ${r.error.message}`);
      else if (got !== want) {
        errors.push(`${e.label}: printed ${JSON.stringify(got).slice(0, 160)} but expected ${JSON.stringify(want).slice(0, 160)}`);
      }
    } else if (e.want === "pass" && !r.ok) {
      errors.push(`${e.label} does not pass${r.error ? ` (${r.error.type}: ${r.error.message})` : r.got ? ` (got ${r.got})` : ""}`);
    } else if (e.want === "fail" && r.ok) {
      errors.push(`${e.label} passes the check, so it is not a wrong option`);
    }
  }
  if (t.methods.length === 0 && t.drills.length === 0 && t.quiz.length === 0) errors.push("topic is empty");
  return { errors, warnings };
}

async function main() {
  const { topics, issues } = loadDrillTopics();
  let failed = issues.length;
  for (const i of issues) console.log(`✗ ${i.file}: ${i.message}`);

  const chosen = selected.length ? topics.filter((t) => selected.includes(t.id)) : topics;
  const queue = [...chosen];
  let cards = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const t = queue.shift()!;
        const { errors, warnings } = await validateTopic(t);
        cards += t.drills.length + t.quiz.length;
        console.log(`${errors.length ? "✗" : "✓"} ${t.id}: ${t.methods.length} cards, ${t.drills.length} drills, ${t.quiz.length} quiz${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""}`);
        for (const e of errors) console.log(`    error: ${e}`);
        for (const w of warnings) console.log(`    warn:  ${w}`);
        if (errors.length) failed++;
      }
    }),
  );

  if (!selected.length) {
    const map = loadPatternMap();
    if (!map) console.log("· no patterns.yaml (pattern recognition disabled)");
    else {
      const ds = loadDataset();
      const labels = new Set(map.labels);
      const problems: string[] = [];
      for (const p of map.problems) {
        if (!ds.problems.has(p.slug)) problems.push(`unknown problem ${p.slug}`);
        if (!labels.has(p.answer)) problems.push(`${p.slug}: unknown label "${p.answer}"`);
        for (const a of p.also) if (!labels.has(a)) problems.push(`${p.slug}: unknown also-label "${a}"`);
        if (map.labels.filter((l) => l !== p.answer && !p.also.includes(l)).length < 3) problems.push(`${p.slug}: fewer than 3 wrong options`);
      }
      const covered = new Set(map.problems.map((p) => p.slug));
      const missing = ds.order.filter((s) => !covered.has(s));
      if (missing.length) problems.push(`problems without a pattern entry: ${missing.join(", ")}`);
      console.log(`${problems.length ? "✗" : "✓"} patterns: ${map.problems.length} problems, ${map.labels.length} labels`);
      for (const p of problems) console.log(`    error: ${p}`);
      if (problems.length) failed++;
      cards += map.problems.length;
    }
  }

  console.log(`\n${chosen.length} topic(s), ${cards} drillable cards; ${failed} with problems.`);
  process.exit(failed ? 1 : 0);
}

void main();
