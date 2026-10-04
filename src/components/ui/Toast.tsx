import { create } from "zustand";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import clsx from "clsx";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const useToasts = create<{ toasts: Toast[]; push: (m: string, t: Tone) => void; remove: (id: number) => void }>((set) => ({
  toasts: [],
  push: (message, tone) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToasts.getState().push(m, "success"),
  error: (m: string) => useToasts.getState().push(m, "error"),
  info: (m: string) => useToasts.getState().push(m, "info"),
};

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const remove = useToasts((s) => s.remove);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => remove(t.id)}
          className="animate-fade-in pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-pop)]"
        >
          {t.tone === "success" && <CheckCircle2 className="size-4 text-success" />}
          {t.tone === "error" && <XCircle className="size-4 text-danger" />}
          {t.tone === "info" && <Info className={clsx("size-4 text-accent")} />}
          {t.message}
        </button>
      ))}
    </div>
  );
}
