import { Button, ButtonGroup, Callout, InputGroup } from "@blueprintjs/core";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildNotificationId } from "../../notifications/notification-policy";
import { useNotificationStore } from "../../notifications/notification-store";
import type { NotificationPayload, NotificationPermissionState } from "../../notifications/types";
import { useDashboardStore } from "../../stores/dashboard-store";
import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import { formatEndTime, formatRemainingTime } from "./timer-format";
import {
  clearTimer,
  computeRemainingMs,
  getDefaultTimerConfig,
  getTimerConfig,
  getTimerRuntimeState,
  markTimerHandled,
  startTimer,
  type TimerMode,
  type TimerWidgetConfig,
} from "./timer-model";

function buildNotificationPayload(
  dashboardId: string,
  instanceId: string,
  timer: TimerWidgetConfig,
): NotificationPayload | null {
  if (!timer.endAt) return null;

  const inputLabel = timer.mode === "absolute" ? timer.absoluteTime : timer.relativeInput;

  return {
    dashboardId,
    sourceType: "timer",
    sourceId: instanceId,
    title: "Timer finished",
    body: inputLabel ? `Your ${inputLabel} reminder is due.` : "Your timer is due.",
    dueAt: timer.endAt,
  };
}

interface TimerEditorProps {
  config: TimerWidgetConfig;
  phase: "idle" | "running" | "due" | "completed";
  remainingText: string;
  error: string | null;
  permission: NotificationPermissionState;
  onModeChange: (mode: TimerMode) => void;
  onRelativeChange: (value: string) => void;
  onAbsoluteChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onClear: () => void | Promise<void>;
  onRequestPermission?: () => void | Promise<unknown>;
}

function PermissionHint({
  permission,
  onRequestPermission,
}: {
  permission: NotificationPermissionState;
  onRequestPermission?: () => void | Promise<unknown>;
}) {
  if (permission === "granted") {
    return <p className="text-xs text-[var(--color-success)]">Browser notifications enabled.</p>;
  }

  if (permission === "denied") {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Browser notifications are blocked; overdue reminders will appear in-app instead.
      </p>
    );
  }

  if (permission === "default" && onRequestPermission) {
    return (
      <Button
        type="button"
        className="self-start text-xs"
        size="small"
        onClick={() => {
          void onRequestPermission();
        }}
      >
        Enable browser notifications
      </Button>
    );
  }

  return (
    <p className="text-xs text-[var(--color-muted-foreground)]">
      Browser notifications are unavailable here; overdue reminders will appear in-app.
    </p>
  );
}

function TimerEditor({
  config,
  phase,
  remainingText,
  error,
  permission,
  onModeChange,
  onRelativeChange,
  onAbsoluteChange,
  onStart,
  onStop,
  onClear,
  onRequestPermission,
}: TimerEditorProps) {
  const isRunning = phase === "running";
  const isCompleted = phase === "completed" || phase === "due";

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-mono font-bold">{remainingText}</span>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {isRunning
            ? `Ends at ${formatEndTime(config.endAt)}`
            : isCompleted
              ? "Timer finished"
              : "Set a reminder"}
        </span>
      </div>

      {isCompleted && (
        <Callout intent="success" className="text-sm">
          Timer completed.
        </Callout>
      )}

      <ButtonGroup fill>
        <Button
          type="button"
          active={config.mode === "relative"}
          onClick={() => onModeChange("relative")}
          disabled={isRunning}
        >
          In
        </Button>
        <Button
          type="button"
          active={config.mode === "absolute"}
          onClick={() => onModeChange("absolute")}
          disabled={isRunning}
        >
          At
        </Button>
      </ButtonGroup>

      {config.mode === "relative" ? (
        <InputGroup
          placeholder="30 minutes"
          value={config.relativeInput}
          onChange={(event) => onRelativeChange(event.target.value)}
          disabled={isRunning}
        />
      ) : (
        <InputGroup
          type="time"
          value={config.absoluteTime}
          onChange={(event) => onAbsoluteChange(event.target.value)}
          disabled={isRunning}
        />
      )}

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

      <div className="flex gap-2">
        {isRunning ? (
          <Button type="button" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="button" className="flex-1" intent="primary" onClick={onStart}>
            Start
          </Button>
        )}
        <Button type="button" onClick={onClear}>
          Clear
        </Button>
      </div>

      <PermissionHint permission={permission} onRequestPermission={onRequestPermission} />
    </div>
  );
}

function TimerReadOnly({ timer }: { timer: TimerWidgetConfig }) {
  const remaining =
    timer.status === "running"
      ? formatRemainingTime(getTimerRuntimeState(timer, new Date()).remainingMs)
      : "--:--";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Timer
      </span>
      <span className="text-3xl font-mono font-bold">{remaining}</span>
      <span className="text-sm text-[var(--color-muted-foreground)]">
        {timer.status === "running" && timer.endAt
          ? `Ends at ${formatEndTime(timer.endAt)}`
          : "Switch to view mode to run the timer"}
      </span>
    </div>
  );
}

function TimerWidget({ instanceId, config, isEditMode }: WidgetProps) {
  const timer = useMemo(() => getTimerConfig(config), [config]);
  const activeDashboardId = useDashboardStore((s) => s.activeDashboard?.id ?? null);
  const persistPatchedWidgetConfigNow = useDashboardStore((s) => s.persistPatchedWidgetConfigNow);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const deliverOrQueue = useNotificationStore((s) => s.deliverOrQueue);
  const queueOverdue = useNotificationStore((s) => s.queueOverdue);
  const dismissBySource = useNotificationStore((s) => s.dismissBySource);
  const permission = useNotificationStore((s) => s.permission);
  const requestPermission = useNotificationStore((s) => s.requestPermission);

  const [draftMode, setDraftMode] = useState<TimerMode>(timer.mode);
  const [draftRelativeInput, setDraftRelativeInput] = useState(timer.relativeInput);
  const [draftAbsoluteTime, setDraftAbsoluteTime] = useState(timer.absoluteTime);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const handledKeyRef = useRef<string | null>(null);
  const observedRunningRef = useRef(false);

  useEffect(() => {
    hydrateNotifications();
  }, [hydrateNotifications]);

  useEffect(() => {
    if (timer.status !== "running") {
      setDraftMode(timer.mode);
      setDraftRelativeInput(timer.relativeInput);
      setDraftAbsoluteTime(timer.absoluteTime);
    }
  }, [timer.absoluteTime, timer.mode, timer.relativeInput, timer.status]);

  useEffect(() => {
    if (timer.status !== "running" || !timer.endAt) {
      observedRunningRef.current = false;
      return;
    }

    const currentNow = new Date();
    observedRunningRef.current = computeRemainingMs(timer.endAt, currentNow) > 0;
    setNow(currentNow);
    const interval = globalThis.setInterval(() => setNow(new Date()), 1000);
    return () => globalThis.clearInterval(interval);
  }, [timer.endAt, timer.status]);

  const runtimeState = useMemo(() => getTimerRuntimeState(timer, now), [now, timer]);
  const notificationPayload = useMemo(
    () => (activeDashboardId ? buildNotificationPayload(activeDashboardId, instanceId, timer) : null),
    [activeDashboardId, instanceId, timer],
  );

  useEffect(() => {
    if (!notificationPayload || !runtimeState.shouldHandleDue) {
      return;
    }

    const notificationKey = buildNotificationId(notificationPayload);
    if (handledKeyRef.current === notificationKey || timer.lastNotificationId === notificationKey) {
      return;
    }

    handledKeyRef.current = notificationKey;

    if (observedRunningRef.current) {
      deliverOrQueue(notificationPayload);
    } else {
      queueOverdue(notificationPayload);
    }

    void persistPatchedWidgetConfigNow(
      instanceId,
      markTimerHandled(timer, new Date().toISOString(), notificationKey),
    );
  }, [
    deliverOrQueue,
    instanceId,
    notificationPayload,
    persistPatchedWidgetConfigNow,
    queueOverdue,
    runtimeState.shouldHandleDue,
    timer,
  ]);

  const handleStart = async () => {
    const next = startTimer(
      {
        ...timer,
        mode: draftMode,
        relativeInput: draftRelativeInput.trim(),
        absoluteTime: draftAbsoluteTime.trim(),
      },
      new Date(),
    );

    if (!next.ok) {
      setError(next.error);
      return;
    }

    handledKeyRef.current = null;
    observedRunningRef.current = true;
    setError(null);
    dismissBySource("timer", instanceId);
    await persistPatchedWidgetConfigNow(instanceId, next.config);
  };

  const handleStop = async () => {
    handledKeyRef.current = null;
    observedRunningRef.current = false;
    setError(null);
    dismissBySource("timer", instanceId);
    await persistPatchedWidgetConfigNow(instanceId, clearTimer(timer));
  };

  const handleClear = async () => {
    handledKeyRef.current = null;
    observedRunningRef.current = false;
    setError(null);
    dismissBySource("timer", instanceId);
    setDraftRelativeInput("");
    setDraftAbsoluteTime("");
    await persistPatchedWidgetConfigNow(instanceId, {
      ...clearTimer(timer),
      relativeInput: "",
      absoluteTime: "",
    });
  };

  const editorConfig: TimerWidgetConfig = {
    ...timer,
    mode: draftMode,
    relativeInput: draftRelativeInput,
    absoluteTime: draftAbsoluteTime,
  };

  const remainingText =
    runtimeState.phase === "running"
      ? formatRemainingTime(runtimeState.remainingMs)
      : runtimeState.phase === "completed" || runtimeState.phase === "due"
        ? "Done"
        : "--:--";

  if (isEditMode) {
    return <TimerReadOnly timer={timer} />;
  }

  return (
    <TimerEditor
      config={editorConfig}
      phase={runtimeState.phase}
      remainingText={remainingText}
      error={error}
      permission={permission}
      onModeChange={(mode) => {
        setError(null);
        setDraftMode(mode);
      }}
      onRelativeChange={(value) => {
        setError(null);
        setDraftRelativeInput(value);
      }}
      onAbsoluteChange={(value) => {
        setError(null);
        setDraftAbsoluteTime(value);
      }}
      onStart={handleStart}
      onStop={handleStop}
      onClear={handleClear}
      onRequestPermission={() => {
        void requestPermission();
      }}
    />
  );
}

function TimerConfigPanel({ config, onChange }: ConfigPanelProps) {
  const timer = useMemo(() => getTimerConfig(config), [config]);
  const [error, setError] = useState<string | null>(null);
  const permission = useNotificationStore((s) => s.permission);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const runtimeState = useMemo(() => getTimerRuntimeState(timer, new Date()), [timer]);

  const editorConfig = timer;
  const remainingText =
    runtimeState.phase === "running"
      ? formatRemainingTime(runtimeState.remainingMs)
      : runtimeState.phase === "completed" || runtimeState.phase === "due"
        ? "Done"
        : "--:--";

  return (
    <TimerEditor
      config={editorConfig}
      phase={runtimeState.phase}
      remainingText={remainingText}
      error={error}
      permission={permission}
      onModeChange={(mode) => {
        setError(null);
        onChange({ ...timer, mode });
      }}
      onRelativeChange={(value) => {
        setError(null);
        onChange({ ...timer, relativeInput: value });
      }}
      onAbsoluteChange={(value) => {
        setError(null);
        onChange({ ...timer, absoluteTime: value });
      }}
      onStart={() => {
        const next = startTimer(timer, new Date());
        if (!next.ok) {
          setError(next.error);
          return;
        }
        setError(null);
        onChange(next.config);
      }}
      onStop={() => {
        setError(null);
        onChange(clearTimer(timer));
      }}
      onClear={() => {
        setError(null);
        onChange({
          ...clearTimer(timer),
          relativeInput: "",
          absoluteTime: "",
        });
      }}
      onRequestPermission={() => {
        void requestPermission();
      }}
    />
  );
}

export const timerDescriptor: WidgetDescriptor = {
  type: "timer",
  name: "Timer",
  description: "Countdown and reminder timer",
  icon: <span className="text-lg">⏲</span>,
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  defaultConfig: getDefaultTimerConfig(),
  component: TimerWidget,
  configPanel: TimerConfigPanel,
  needsScroll: false,
};
