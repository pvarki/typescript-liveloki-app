import { TextArea } from "@blueprintjs/core";

import type { ConfigPanelProps,WidgetDescriptor, WidgetProps } from "../../types";

function NoteWidget({ config, isEditMode, onChange }: WidgetProps) {
  const text = (config.text as string) || "Double-click to edit...";

  if (isEditMode) {
    return (
      <div className="flex h-full flex-col p-3">
        <TextArea
          className="h-full w-full resize-none"
          value={text}
          onChange={(event) => onChange?.({ ...config, text: event.target.value })}
          placeholder="Type your note..."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full p-3">
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function NoteConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium">Note Text</label>
      <TextArea
        fill
        rows={4}
        value={(config.text as string) || ""}
        onChange={(e) => onChange({ ...config, text: e.target.value })}
      />
    </div>
  );
}

export const noteDescriptor: WidgetDescriptor = {
  type: "note",
  name: "Note",
  description: "Editable text note",
  icon: <span className="text-lg">&#x1F4DD;</span>,
  defaultSize: { w: 4, h: 4, minW: 2, minH: 2 },
  defaultConfig: { text: "" },
  component: NoteWidget,
  configPanel: NoteConfigPanel,
  needsScroll: false,
};
