import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export function Select({
  options,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ value: string; label: string }> }) {
  return (
    <div className={clsx("relative inline-flex", className)}>
      <select
        className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface pr-7 pl-2.5 text-[13px] text-fg hover:border-border-strong focus:border-accent focus:outline-none"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-subtle" />
    </div>
  );
}
