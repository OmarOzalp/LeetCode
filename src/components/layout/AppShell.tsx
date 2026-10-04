import { Suspense, useEffect } from "react";
import { Outlet } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/lib/store";
import { Button, Spinner } from "@/components/ui/Button";
import { Toaster } from "@/components/ui/Toast";

export function AppShell() {
  const ready = useAppStore((s) => s.ready);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (error && !ready) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-surface p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 size-6 text-warning" />
          <h1 className="text-sm font-semibold">Can't reach the local server</h1>
          <p className="mt-1 text-[13px] text-muted">{error}</p>
          <p className="mt-3 text-xs text-subtle">
            Start everything with <code className="rounded bg-surface-3 px-1 font-mono">npm run dev</code>, then retry.
          </p>
          <Button className="mt-4" icon={<RefreshCw className="size-3.5" />} onClick={() => void init()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col">
        {ready ? (
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        ) : (
          <PageSpinner />
        )}
      </main>
      <Toaster />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center text-muted">
      <Spinner className="size-5" />
    </div>
  );
}

/** Scrollable page container used by non-workspace pages. */
export function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={wide ? "mx-auto max-w-[1400px] px-6 py-6" : "mx-auto max-w-[1180px] px-6 py-6"}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
