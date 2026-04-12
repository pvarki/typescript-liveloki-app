import { isRouteErrorResponse, useRouteError } from "react-router-dom";

function getRouteErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "An unexpected UI error occurred.";
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-6 text-[var(--color-foreground)]">
      <div className="max-w-xl rounded border border-[var(--color-danger)]/40 bg-[var(--color-surface)] p-4 shadow">
        <h1 className="mb-2 text-lg font-semibold text-[var(--color-danger)]">
          Something went wrong
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{getRouteErrorMessage(error)}</p>
      </div>
    </div>
  );
}
