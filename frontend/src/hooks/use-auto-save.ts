import { useEffect, useRef } from "react";

import { useDashboardStore } from "../stores/dashboard-store";

export function useAutoSave(delayMs = 2000) {
  const isDirty = useDashboardStore((s) => s.isDirty);
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const saveDashboard = useDashboardStore((s) => s.saveDashboard);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isDirty && isEditMode) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveDashboard();
      }, delayMs);
    }
    return () => clearTimeout(timerRef.current);
  }, [isDirty, isEditMode, delayMs, saveDashboard]);
}
