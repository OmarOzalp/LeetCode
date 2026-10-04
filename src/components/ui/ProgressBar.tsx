import clsx from "clsx";

export function ProgressBar({
  value,
  max,
  color,
  className,
  height = 6,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={clsx("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color ?? "var(--accent)" }} />
    </div>
  );
}
