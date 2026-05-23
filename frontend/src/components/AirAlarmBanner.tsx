import { useBattlelogEvents } from "../battlelog/event-data";
import { deriveActiveAlarm } from "../widgets/air-surveillance/alarm";

export function AirAlarmBanner() {
  const { data: events } = useBattlelogEvents();
  const alarm = deriveActiveAlarm(events);
  if (!alarm) return null;
  const isImmediate = alarm.state === "ilmahalytys";
  return (
    <div
      role="alert"
      className={`flex items-center justify-center gap-3 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white ${
        isImmediate ? "bg-red-700 animate-pulse" : "bg-orange-600"
      }`}
    >
      <span className="font-mono text-base">{isImmediate ? "⚠" : "!"}</span>
      <span>{isImmediate ? "ILMAHÄLYTYS" : "ILMAVAROITUS"}</span>
      <span className="text-xs font-normal opacity-80">annettu {new Date(alarm.declaredAt).toLocaleTimeString()}</span>
    </div>
  );
}
