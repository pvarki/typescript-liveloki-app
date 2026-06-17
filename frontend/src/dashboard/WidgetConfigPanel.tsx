import { useDashboardStore } from "../stores/dashboard-store";
import { useWidgetRegistry } from "../stores/widget-registry";

export default function WidgetConfigPanel() {
  const { selectedWidgetId, activeDashboard, updateWidgetConfig } = useDashboardStore();
  const getDescriptor = useWidgetRegistry((s) => s.get);

  if (!selectedWidgetId || !activeDashboard) return null;

  const widget = activeDashboard.widgets.find((w) => w.id === selectedWidgetId);
  if (!widget) return null;

  const descriptor = getDescriptor(widget.type);
  if (!descriptor?.configPanel) return null;

  const ConfigPanel = descriptor.configPanel;

  return (
    <div className="absolute right-0 top-0 z-40 h-full w-64 border-l border-[var(--color-separator)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold">{descriptor.name} Settings</h3>
      <ConfigPanel
        config={widget.config}
        onChange={(config) => updateWidgetConfig(widget.id, config)}
      />
    </div>
  );
}
