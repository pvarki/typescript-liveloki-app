import { Button, Card } from "@blueprintjs/core";
import { useRef } from "react";

import { useDashboardStore } from "../stores/dashboard-store";
import { useWidgetRegistry } from "../stores/widget-registry";
import type { WidgetInstance } from "../types";

interface WidgetWrapperProps {
  widget: WidgetInstance;
  isEditMode: boolean;
}

export default function WidgetWrapper({ widget, isEditMode }: WidgetWrapperProps) {
  const descriptor = useWidgetRegistry((s) => s.widgets.get(widget.type));
  const { selectedWidgetId, selectWidget, removeWidget, updateWidgetConfig } =
    useDashboardStore();
  const isSelected = selectedWidgetId === widget.id;
  const ref = useRef<HTMLDivElement>(null);

  if (!descriptor) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-danger)] text-sm">
        Unknown widget: {widget.type}
      </div>
    );
  }

  const WidgetComponent = descriptor.component;

  return (
    <div
      ref={ref}
      className="h-full w-full"
      onClick={(e) => {
        if (isEditMode) {
          e.stopPropagation();
          selectWidget(widget.id);
        }
      }}
    >
      <Card
        className={`h-full w-full overflow-hidden ${
          isSelected && isEditMode
            ? "ring-2 ring-[var(--color-accent)]"
            : ""
        } ${isEditMode ? "cursor-grab" : ""}`}
      >
        <div className={`h-full p-0 ${descriptor.needsScroll ? "overflow-y-auto" : "overflow-hidden"}`}>
          <WidgetComponent
            instanceId={widget.id}
            config={widget.config}
            isEditMode={isEditMode}
            onChange={(newConfig: Record<string, unknown>) =>
              updateWidgetConfig(widget.id, newConfig)
            }
          />
        </div>
      </Card>
      {isEditMode && (
        <Button
          icon="cross"
          intent="danger"
          size="small"
          variant="minimal"
          className="absolute right-1 top-1 z-50 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-xs text-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
          style={{ opacity: isSelected ? 1 : undefined }}
          onClick={(e) => {
            e.stopPropagation();
            removeWidget(widget.id);
          }}
          title="Remove widget"
          aria-label="Remove widget"
        />
      )}
    </div>
  );
}
