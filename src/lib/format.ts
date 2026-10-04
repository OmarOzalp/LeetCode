/** Render a JSON value the way Python would print it (None/True/False, double-quoted strings). */
export function pyRepr(value: unknown, maxLength = 4000): string {
  const out: string[] = [];
  let len = 0;
  let truncated = false;

  const push = (s: string) => {
    if (truncated) return;
    if (len + s.length > maxLength) {
      out.push(s.slice(0, Math.max(0, maxLength - len)));
      truncated = true;
      return;
    }
    out.push(s);
    len += s.length;
  };

  const walk = (v: unknown) => {
    if (truncated) return;
    if (v === null || v === undefined) push("None");
    else if (v === true) push("True");
    else if (v === false) push("False");
    else if (typeof v === "number") push(Number.isInteger(v) ? String(v) : formatFloat(v));
    else if (typeof v === "string") push(JSON.stringify(v));
    else if (Array.isArray(v)) {
      push("[");
      v.forEach((x, i) => {
        if (i) push(", ");
        walk(x);
      });
      push("]");
    } else if (typeof v === "object") {
      push("{");
      Object.entries(v as Record<string, unknown>).forEach(([k, x], i) => {
        if (i) push(", ");
        push(JSON.stringify(k) + ": ");
        walk(x);
      });
      push("}");
    } else push(String(v));
  };
  walk(value);
  return out.join("") + (truncated ? " …" : "");
}

function formatFloat(v: number): string {
  const s = String(v);
  return s.includes(".") || s.includes("e") ? s : `${s}.0`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms < 0.01) return "<0.01 ms";
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 100) return `${ms.toFixed(1)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

const DAY = 86_400_000;

export function daysSince(iso: string | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / DAY);
}

export function relativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = now - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.round(day / 7)}w ago`;
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function pluralize(n: number, word: string, plural = `${word}s`): string {
  return `${n} ${n === 1 ? word : plural}`;
}
