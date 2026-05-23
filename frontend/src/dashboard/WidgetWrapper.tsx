import { Button, Card } from "@blueprintjs/core";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import { useDashboardStore } from "../stores/dashboard-store";
import { useWidgetRegistry } from "../stores/widget-registry";
import type { WidgetInstance } from "../types";
import { DEFAULT_DASHBOARD_SETTINGS } from "./dashboard-settings";
import {
  createWidgetClipboardPayload,
  createWidgetFromClipboard,
  serializeWidgetForClipboard,
} from "./widget-clipboard";

interface WidgetWrapperProps {
  widget: WidgetInstance;
  isEditMode: boolean;
}

export default function WidgetWrapper({ widget, isEditMode }: WidgetWrapperProps) {
  const descriptor = useWidgetRegistry((s) => s.widgets.get(widget.type));
  const getDescriptor = useWidgetRegistry((s) => s.get);
  const {
    activeDashboard,
    selectedWidgetId,
    selectWidget,
    addWidget,
    removeWidget,
    updateWidget,
    updateWidgetConfig,
  } = useDashboardStore();
  const isSelected = selectedWidgetId === widget.id;
  const ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPos, setHelpPos] = useState<{ top: number; right: number } | null>(null);
  const helpWrapperRef = useRef<HTMLDivElement | null>(null);
  const openHelp = () => {
    const rect = helpWrapperRef.current?.getBoundingClientRect();
    if (rect) setHelpPos({ top: rect.bottom + 4, right: globalThis.innerWidth - rect.right });
    setHelpOpen(true);
  };
  const closeHelp = () => {
    setHelpOpen(false);
    setHelpPos(null);
  };
  const settings = activeDashboard?.settings ?? DEFAULT_DASHBOARD_SETTINGS;
  const showHeader =
    settings.widgetHeaders === "always" || (settings.widgetHeaders === "edit-only" && isEditMode);
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
  const copyWidget = async () => {
    try {
      await navigator.clipboard.writeText(serializeWidgetForClipboard(widget, descriptor));
      toast.success("Widget copied");
    } catch {
      toast.error("Clipboard write failed");
    }
  };
  const duplicateWidget = () => {
    const payload = createWidgetClipboardPayload(widget, descriptor);
    const pasted = createWidgetFromClipboard(JSON.stringify(payload), getDescriptor);
    if (!pasted.ok || !pasted.widget) {
      toast.error(pasted.error ?? "Could not duplicate widget");
      return;
    }

    addWidget({
      ...pasted.widget,
      gridPosition: {
        ...pasted.widget.gridPosition,
        x: widget.gridPosition.x + 1,
        y: widget.gridPosition.y + 1,
      },
    });
    selectWidget(pasted.widget.id);
  };
  const pasteWidget = async () => {
    try {
      const pasted = createWidgetFromClipboard(await navigator.clipboard.readText(), getDescriptor);
      if (!pasted.ok || !pasted.widget) {
        toast.error(pasted.error ?? "Could not paste widget");
        return;
      }

      addWidget(pasted.widget);
      selectWidget(pasted.widget.id);
      toast.success("Widget pasted");
    } catch {
      toast.error("Clipboard read failed");
    }
  };
  const resetSize = () => {
    updateWidget(widget.id, {
      gridPosition: {
        ...widget.gridPosition,
        w: descriptor.defaultSize.w,
        h: descriptor.defaultSize.h,
        minW: descriptor.defaultSize.minW,
        minH: descriptor.defaultSize.minH,
      },
    });
  };
  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      ref={ref}
      className="h-full w-full"
      onContextMenu={(event) => {
        if (!isEditMode) return;
        event.preventDefault();
        event.stopPropagation();
        selectWidget(widget.id);
        setMenuOpen(true);
      }}
      onClick={(e) => {
        if (isEditMode) {
          e.stopPropagation();
          selectWidget(widget.id);
          setMenuOpen(false);
        }
      }}
    >
      <Card
        className={`relative flex h-full w-full flex-col overflow-hidden !p-0 ${
          isSelected && isEditMode ? "ring-2 ring-[var(--color-accent)]" : ""
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
        <div
          className={`min-h-0 flex-1 p-1 ${descriptor.needsScroll ? "overflow-y-auto" : "overflow-hidden"}`}
        >
          <WidgetComponent
            instanceId={widget.id}
            config={widget.config}
            isEditMode={isEditMode}
            onChange={(newConfig: Record<string, unknown>) => updateWidgetConfig(widget.id, newConfig)}
          />
        </div>
      </Card>
      {descriptor.help && (
        <div ref={helpWrapperRef} className={`absolute top-1 z-50 ${isEditMode ? "right-8" : "right-1"}`}>
          <Button
            icon="help"
            size="small"
            variant="minimal"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] text-xs opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
            style={{ opacity: helpOpen ? 1 : undefined }}
            onClick={(event) => {
              event.stopPropagation();
              if (helpOpen) closeHelp(); else openHelp();
            }}
            title="Quick help"
            aria-label="Quick help"
          />
        </div>
      )}
      {descriptor.help && helpOpen && helpPos && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={closeHelp} aria-hidden="true" />
          <div
            className="fixed z-[101] w-72 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded border border-[var(--color-separator)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-foreground)] shadow-lg"
            style={{ top: helpPos.top, right: helpPos.right }}
            onClick={(event) => event.stopPropagation()}
          >
            {descriptor.help}
          </div>
        </>,
        document.body,
      )}
      {isEditMode && (
        <div className="absolute right-1 top-1 z-50">
          <Button
            icon="more"
            size="small"
            variant="minimal"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] text-xs opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
            style={{ opacity: isSelected || menuOpen ? 1 : undefined }}
            onClick={(event) => {
              event.stopPropagation();
              selectWidget(widget.id);
              setMenuOpen((open) => !open);
            }}
            title="Widget actions"
            aria-label="Widget actions"
          />
          {menuOpen && (
            <div
              className="absolute right-0 mt-1 flex w-40 flex-col rounded border border-[var(--color-separator)] bg-[var(--color-surface)] p-1 text-xs shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="rounded px-2 py-1 text-left hover:bg-[var(--color-surface-secondary)]"
                type="button"
                onClick={closeMenu}
              >
                Settings
              </button>
              <button
                className="rounded px-2 py-1 text-left hover:bg-[var(--color-surface-secondary)]"
                type="button"
                onClick={() => void copyWidget().finally(closeMenu)}
              >
                Copy
              </button>
              <button
                className="rounded px-2 py-1 text-left hover:bg-[var(--color-surface-secondary)]"
                type="button"
                onClick={() => void pasteWidget().finally(closeMenu)}
              >
                Paste
              </button>
              <button
                className="rounded px-2 py-1 text-left hover:bg-[var(--color-surface-secondary)]"
                type="button"
                onClick={() => {
                  duplicateWidget();
                  closeMenu();
                }}
              >
                Duplicate
              </button>
              <button
                className="rounded px-2 py-1 text-left hover:bg-[var(--color-surface-secondary)]"
                type="button"
                onClick={() => {
                  resetSize();
                  closeMenu();
                }}
              >
                Reset size
              </button>
              <button
                className="rounded px-2 py-1 text-left text-[var(--color-danger)] hover:bg-[var(--color-surface-secondary)]"
                type="button"
                onClick={() => {
                  removeWidget(widget.id);
                  closeMenu();
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
