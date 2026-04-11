import { Button, Card, Drawer, InputGroup } from "@blueprintjs/core";
import { useMemo, useState } from "react";

import { useDashboardStore } from "../stores/dashboard-store";
import { useWidgetRegistry } from "../stores/widget-registry";
import { createWidgetGridPosition } from "./grid-layout-model";
import { createWidgetId } from "./widget-id";

interface WidgetPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WidgetPalette({ isOpen, onClose }: WidgetPaletteProps) {
  const widgetsMap = useWidgetRegistry((s) => s.widgets);
  const allWidgets = useMemo(() => [...widgetsMap.values()], [widgetsMap]);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const [search, setSearch] = useState("");

  const filtered = allWidgets.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (type: string) => {
    const descriptor = allWidgets.find((w) => w.type === type);
    if (!descriptor) return;
    const widgets = useDashboardStore.getState().activeDashboard?.widgets ?? [];
    addWidget({
      id: createWidgetId(descriptor.type),
      type: descriptor.type,
      gridPosition: createWidgetGridPosition(widgets, descriptor.defaultSize),
      config: structuredClone(descriptor.defaultConfig),
    });
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="left" size="18rem" title="Add Widget">
      <div className="flex h-full flex-col gap-3 p-4">
        <InputGroup
          leftIcon="search"
          placeholder="Search widgets..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          rightElement={
            search ? (
              <Button icon="cross" minimal onClick={() => setSearch("")} aria-label="Clear search" />
            ) : undefined
          }
        />
        <div className="flex flex-col gap-2 overflow-y-auto">
          {filtered.map((w) => (
              <Card
                key={w.type}
                className="cursor-pointer transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
                interactive
                onClick={() => {
                  handleAdd(w.type);
                  onClose();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{w.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{w.name}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {w.description}
                    </span>
                  </div>
                </div>
              </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No widgets found</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
