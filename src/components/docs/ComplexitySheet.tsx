import { GROWTH, INPUT_SIZE_GUIDE, OPERATION_GROUPS } from "@/data/complexity";

const GROWTH_TONE = ["var(--easy)", "var(--easy)", "var(--easy)", "var(--medium)", "var(--medium)", "var(--hard)", "var(--hard)"];

export function ComplexitySheet() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Growth hierarchy</h3>
          <div className="flex flex-col gap-2">
            {GROWTH.map((g, i) => (
              <div key={g.notation} className="grid grid-cols-[88px_1fr_auto] items-center gap-3">
                <code className="font-mono text-[12.5px] font-semibold">{g.notation}</code>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, (Math.log10(g.log10At1000 + 1) / Math.log10(2568)) * 100))}%`, background: GROWTH_TONE[i] }} />
                </div>
                <span className="w-28 text-right text-xs text-muted">{g.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-subtle">Bars show relative work at n = 1,000 on a compressed scale; each step down is dramatically more expensive.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold">What input size allows</h3>
          <table className="w-full text-[13px]">
            <tbody>
              {INPUT_SIZE_GUIDE.map((r) => (
                <tr key={r.n} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-3 font-mono text-[12px] whitespace-nowrap">{r.n}</td>
                  <td className="py-1.5 text-muted">{r.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-subtle">Rule of thumb: a judge does roughly 10⁷–10⁸ simple Python operations per second. Read the constraints first — they hint at the intended complexity.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {OPERATION_GROUPS.map((g) => (
          <div key={g.title} className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 text-[13px] font-semibold">{g.title}</h3>
            <table className="w-full text-[12.5px]">
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.op} className="border-b border-border/60 align-top last:border-0">
                    <td className="py-1.5 pr-2">
                      <div>{r.op}</div>
                      {r.code && <code className="font-mono text-[11px] text-subtle">{r.code}</code>}
                      {r.note && <div className="text-[11px] text-subtle">{r.note}</div>}
                    </td>
                    <td className="py-1.5 text-right font-mono text-[12px] whitespace-nowrap">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
