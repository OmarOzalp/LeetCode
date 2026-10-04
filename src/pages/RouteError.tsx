import { isRouteErrorResponse, useRouteError } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Shown when a page throws while rendering or a lazy chunk fails to load. */
export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error);
  const chunk = /dynamically imported module|Importing a module script failed/i.test(message);
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-border bg-surface p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 size-6 text-warning" />
        <h1 className="text-sm font-semibold">{chunk ? "The app was updated" : "Something went wrong"}</h1>
        <p className="mt-1 text-[13px] break-words text-muted">{chunk ? "Reload to get the latest version." : message}</p>
        <Button className="mt-4" icon={<RefreshCw className="size-3.5" />} onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
