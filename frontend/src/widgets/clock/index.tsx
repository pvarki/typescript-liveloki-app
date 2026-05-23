import { useEffect,useState } from "react";

import type { WidgetDescriptor, WidgetProps } from "../../types";

function ClockWidget({ isEditMode }: WidgetProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("en-US", { hour12: false });
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <span className="text-4xl font-mono font-bold text-[var(--color-foreground)]">{time}</span>
      <span className="text-sm text-[var(--color-muted-foreground)]">{date}</span>
      {isEditMode && (
        <span className="text-xs text-[var(--color-muted-foreground)] mt-2">Clock Widget</span>
      )}
    </div>
  );
}

export const clockDescriptor: WidgetDescriptor = {
  type: "clock",
  name: "Clock",
  description: "Digital clock with date display",
  icon: <span className="text-lg">&#x1F551;</span>,
  defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
  defaultConfig: {},
  component: ClockWidget,
  needsScroll: false,
};
