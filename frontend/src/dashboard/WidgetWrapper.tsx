import { Button, Card } from "@blueprintjs/core";
import { useRef } from "react";

import { useDashboardStore } from "../stores/dashboard-store";
import { useWidgetRegistry } from "../stores/widget-registry";
import type { WidgetInstance } from "../types";
import { DEFAULT_DASHBOARD_SETTINGS } from "./dashboard-settings";

interface WidgetWrapperProps {
  widget: WidgetInstance;
  isEditMode: boolean;
}

export default function WidgetWrapper({ widget, isEditMode }: WidgetWrapperProps) {
  const descriptor = useWidgetRegistry((s) => s.widgets.get(widget.type));
  const { activeDashboard, selectedWidgetId, selectWidget, removeWidget, updateWidgetConfig } =
    useDashboardStore();
  const isSelected = selectedWidgetId === widget.id;
  const ref = useRef<HTMLDivElement>(null);
  const settings = activeDashboard?.settings ?? DEFAULT_DASHBOARD_SETTINGS;
  const showHeader =
    settings.widgetHeaders === "always" ||
    (settings.widgetHeaders === "edit-only" && isEditMode);
  let borderColor = "var(--color-separator)";
  if (settings.widgetBorders === "none") {
    borderColor = "transparent";
  } else if (settings.widgetBorders === "visible") {
    borderColor = "var(--color-accent)";
  }

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
        className={`relative flex h-full w-full flex-col overflow-hidden !p-0 ${
          isSelected && isEditMode
            ? "ring-2 ring-[var(--color-accent)]"
            : ""
        }`}
        style={{
          borderColor,
          borderStyle: "solid",
          borderWidth: settings.widgetBorders === "none" ? 0 : 1,
        }}
      >
        {showHeader && (
          <div
            className={`dashboard-widget-drag-handle flex h-7 shrink-0 items-center border-b border-[var(--color-separator)] px-2 text-xs font-medium text-[var(--color-muted-foreground)] ${
              isEditMode ? "cursor-grab" : ""
            }`}
          >
            {descriptor.name}
          </div>
        )}
        {isEditMode && !showHeader && (
          <div
            className="dashboard-widget-drag-handle absolute left-0 top-0 z-10 h-3 w-full cursor-grab"
            aria-hidden="true"
          />
        )}
        <div className={`min-h-0 flex-1 p-0 ${descriptor.needsScroll ? "overflow-y-auto" : "overflow-hidden"}`}>
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
