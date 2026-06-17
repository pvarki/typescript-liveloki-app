import { FormGroup, HTMLSelect, InputGroup } from "@blueprintjs/core";

import type { ConfigPanelProps,WidgetDescriptor, WidgetProps } from "../../types";

function MetricWidget({ config }: WidgetProps) {
  const label = (config.label as string) || "Metric";
  const value = (config.value as string) || "--";
  const unit = (config.unit as string) || "";
  const status = (config.status as string) || "normal";

  const statusColors: Record<string, string> = {
    normal: "text-[var(--color-foreground)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <span className="text-xs uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className={`text-3xl font-bold font-mono ${statusColors[status] || statusColors.normal}`}>
        {value}
        {unit && <span className="text-lg ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function MetricConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <FormGroup label="Label">
      <InputGroup
        value={(config.label as string) || ""}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
      />
      </FormGroup>
      <FormGroup label="Value">
      <InputGroup
        value={(config.value as string) || ""}
        onChange={(e) => onChange({ ...config, value: e.target.value })}
      />
      </FormGroup>
      <FormGroup label="Unit">
      <InputGroup
        value={(config.unit as string) || ""}
        onChange={(e) => onChange({ ...config, unit: e.target.value })}
      />
      </FormGroup>
      <FormGroup label="Status">
      <HTMLSelect
        fill
        value={(config.status as string) || "normal"}
        onChange={(e) => onChange({ ...config, status: e.target.value })}
        options={[
          { value: "normal", label: "Normal" },
          { value: "success", label: "Success" },
          { value: "warning", label: "Warning" },
          { value: "danger", label: "Danger" },
        ]}
      />
      </FormGroup>
    </div>
  );
}

export const metricDescriptor: WidgetDescriptor = {
  type: "metric",
  name: "Metric",
  description: "Single value metric display with status color",
  icon: <span className="text-lg">&#x1F4CA;</span>,
  defaultSize: { w: 3, h: 3, minW: 2, minH: 2 },
  defaultConfig: { label: "Metric", value: "--", unit: "", status: "normal" },
  component: MetricWidget,
  configPanel: MetricConfigPanel,
  needsScroll: false,
};
