import { Button, Card, Checkbox, InputGroup, Popover } from "@blueprintjs/core";
import { closestCenter, DndContext, type DragEndEvent,PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable,verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import { useDashboardStore } from "../../stores/dashboard-store";
import type { ConfigPanelProps,WidgetDescriptor, WidgetProps } from "../../types";

interface Task {
  id: string;
  text: string;
  done: boolean;
  color?: string;
}

const DEFAULT_TASK_COLOR = "#64748b";
const TASK_COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

function getTasks(config: Record<string, unknown>): Task[] {
  return (config.tasks as Task[]) || [];
}

interface TaskColorPickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}

function TaskColorPicker({ label, value, onChange }: TaskColorPickerProps) {
  const selectedColor = value || DEFAULT_TASK_COLOR;

  return (
    <Popover
      placement="left"
      content={
        <div className="flex w-44 flex-wrap gap-2 p-2">
          {TASK_COLOR_PRESETS.map((preset) => (
            <Button
              key={preset}
              aria-label={`${label}: ${preset}`}
              className="!min-h-0 !min-w-0 !p-0"
              style={{ backgroundColor: preset, height: 24, width: 24 }}
              onClick={() => onChange(preset)}
            />
          ))}
        </div>
      }
    >
      <Button
        aria-label={label}
        className="!min-h-0 !min-w-0"
        style={{ backgroundColor: selectedColor, height: 32, width: 40 }}
      />
    </Popover>
  );
}

function TodoWidget({ instanceId, config, isEditMode }: WidgetProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const tasks = getTasks(config);

  const updateTasks = (newTasks: Task[]) => {
    updateWidgetConfig(instanceId, { ...config, tasks: newTasks });
    if (!isEditMode) {
      setTimeout(() => useDashboardStore.getState().saveDashboard(), 0);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {isEditMode ? "Click to configure tasks" : "No tasks"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="group flex items-start gap-2 rounded-sm px-1 -mx-1"
          style={task.color ? { backgroundColor: task.color } : undefined}
        >
          <Checkbox
            checked={task.done}
            onChange={() => updateTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))}
            className="mt-0.5"
          />
          <span className={`flex-1 text-sm ${task.done ? "line-through text-[var(--color-muted-foreground)]" : ""}`}>
            {task.text}
          </span>
          <Button
            icon="cross"
            minimal
            size="small"
            className="mt-0.5 text-xs text-[var(--color-muted-foreground)] opacity-0 hover:text-[var(--color-danger)] group-hover:opacity-100"
            onClick={() => updateTasks(tasks.filter((t) => t.id !== task.id))}
          />
        </div>
      ))}
    </div>
  );
}

function SortableTaskItem({ task, config, onChange }: { task: Task; config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} className="flex items-center gap-2 !p-2">
      <Button {...attributes} {...listeners} minimal className="cursor-grab text-[var(--color-muted-foreground)] active:cursor-grabbing">
        ⠿
      </Button>
      <InputGroup
        className="min-w-0 flex-1"
        value={task.text}
        onChange={(e) => {
          const tasks = getTasks(config);
          onChange({
            ...config,
            tasks: tasks.map((t) => (t.id === task.id ? { ...t, text: e.target.value } : t)),
          });
        }}
      />
      <TaskColorPicker
        label={`Task color for ${task.text || "task"}`}
        value={task.color}
        onChange={(color) => {
          const tasks = getTasks(config);
          onChange({
            ...config,
            tasks: tasks.map((t) => (t.id === task.id ? { ...t, color } : t)),
          });
        }}
      />
      <Button
        icon="cross"
        minimal
        size="small"
        className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
        onClick={() => {
          const tasks = getTasks(config);
          onChange({
            ...config,
            tasks: tasks.filter((t) => t.id !== task.id),
          });
        }}
      />
    </Card>
  );
}

function TodoConfigPanel({ config, onChange }: ConfigPanelProps) {
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskColor, setNewTaskColor] = useState<string | undefined>();
  const tasks = getTasks(config);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    const id = Math.random().toString(36).slice(2, 10);
    onChange({
      ...config,
      tasks: [...tasks, { id, text, done: false, color: newTaskColor }],
    });
    setNewTaskText("");
    setNewTaskColor(undefined);
  };

  const reorderTasks = (oldIndex: number, newIndex: number) => {
    const updated = [...tasks];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);
    onChange({ ...config, tasks: updated });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-field)] p-2">
        <div className="flex gap-2">
          <InputGroup
            className="flex-1"
            placeholder="New task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <Button
            icon="plus"
            onClick={addTask}
            aria-label="Add task"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium">Task color</span>
          <div className="flex items-center gap-2">
            <TaskColorPicker
              label="New task color"
              value={newTaskColor}
              onChange={setNewTaskColor}
            />
            <Button
              type="button"
              minimal
              size="small"
              className="text-xs text-[var(--color-muted-foreground)] disabled:opacity-50"
              onClick={() => setNewTaskColor(undefined)}
              disabled={!newTaskColor}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            const oldIndex = tasks.findIndex((t) => t.id === active.id);
            const newIndex = tasks.findIndex((t) => t.id === over.id);
            reorderTasks(oldIndex, newIndex);
          }
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {tasks.map((task) => (
              <SortableTaskItem key={task.id} task={task} config={config} onChange={onChange} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export const todoDescriptor: WidgetDescriptor = {
  type: "todo",
  name: "Todo List",
  description: "Checkable task list with drag-to-reorder",
  icon: <span className="text-lg">☑</span>,
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  defaultConfig: { tasks: [] },
  component: TodoWidget,
  configPanel: TodoConfigPanel,
  needsScroll: true,
};
