import { drillCheckExpr, drillProgram, type DrillItem } from "../../shared/drillSchema.ts";
import type { DrillCheckResponse } from "../../shared/api.ts";
import { runDrillBatch } from "../runner/judge.ts";

/** Phone/OS keyboards insert curly quotes and long dashes; make them Python again. */
export function sanitizeFill(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/—/g, "--")
    .replace(/–/g, "-")
    .replace(/ /g, " ");
}

export async function checkDrill(d: DrillItem, fill: string): Promise<DrillCheckResponse> {
  const [res] = await runDrillBatch([{ key: d.id, kind: "drill", setup: d.setup, code: drillProgram(d, sanitizeFill(fill)), show: d.show, check: drillCheckExpr(d) }]);
  return { ok: res.ok, got: res.got, error: res.error, stdout: res.stdout };
}
