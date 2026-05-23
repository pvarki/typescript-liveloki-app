import type { ReactNode } from "react";

/**
 * Consistent bottom action bar for widgets.
 * Renders a border-top separator with right-aligned primary button
 * and optional left-aligned secondary button.
 */
export function WidgetActionBar({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-t border-[var(--color-border)] p-2">
      {secondary && <div className="max-w-48">{secondary}</div>}
      <div className="flex-1" />
      <div className="max-w-48">{primary}</div>
    </div>
  );
}
