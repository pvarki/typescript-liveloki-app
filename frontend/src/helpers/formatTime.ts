import { parseISO } from "date-fns";

export function formatTime(iso8601time: string) {
  const d = parseISO(iso8601time);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString();
  }
  return d.toLocaleString();
}
