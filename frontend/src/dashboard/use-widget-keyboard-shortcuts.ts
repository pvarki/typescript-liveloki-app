import { useEffect } from "react";
import toast from "react-hot-toast";

import { useDashboardStore } from "../stores/dashboard-store";
import { useWidgetRegistry } from "../stores/widget-registry";
import {
  createWidgetClipboardPayload,
  createWidgetFromClipboard,
  serializeWidgetForClipboard,
} from "./widget-clipboard";

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function useWidgetKeyboardShortcuts(enabled: boolean) {
  const getDescriptor = useWidgetRegistry((state) => state.get);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return;

      const state = useDashboardStore.getState();
      const selectedWidget = state.activeDashboard?.widgets.find(
        (widget) => widget.id === state.selectedWidgetId,
      );
      const descriptor = selectedWidget ? getDescriptor(selectedWidget.type) : undefined;
      const modifier = event.ctrlKey || event.metaKey;

      if (event.key === "Escape") {
        state.selectWidget(null);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedWidget) {
        event.preventDefault();
        state.removeWidget(selectedWidget.id);
        return;
      }

      if (modifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        const clipboard = navigator.clipboard;
        if (!clipboard) {
          toast.error("Clipboard read failed");
          return;
        }

        void clipboard
          .readText()
          .then((text) => {
            const pasted = createWidgetFromClipboard(text, getDescriptor);
            if (!pasted.ok || !pasted.widget) {
              toast.error(pasted.error ?? "Could not paste widget");
              return;
            }

            state.addWidget(pasted.widget);
            state.selectWidget(pasted.widget.id);
          })
          .catch(() => toast.error("Clipboard read failed"));
        return;
      }

      if (!selectedWidget || !descriptor) return;

      if (modifier && event.key.toLowerCase() === "c") {
        event.preventDefault();
        const clipboard = navigator.clipboard;
        if (!clipboard) {
          toast.error("Clipboard write failed");
          return;
        }

        void clipboard
          .writeText(serializeWidgetForClipboard(selectedWidget, descriptor))
          .then(() => toast.success("Widget copied"))
          .catch(() => toast.error("Clipboard write failed"));
        return;
      }

      if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        const payload = createWidgetClipboardPayload(selectedWidget, descriptor);
        const duplicated = createWidgetFromClipboard(JSON.stringify(payload), getDescriptor);
        if (!duplicated.ok || !duplicated.widget) return;

        state.addWidget({
          ...duplicated.widget,
          gridPosition: {
            ...duplicated.widget.gridPosition,
            x: selectedWidget.gridPosition.x + 1,
            y: selectedWidget.gridPosition.y + 1,
          },
        });
        state.selectWidget(duplicated.widget.id);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [enabled, getDescriptor]);
}
