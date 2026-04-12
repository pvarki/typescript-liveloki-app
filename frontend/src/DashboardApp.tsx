import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

import EventDetailOverlay from "./battlelog/EventDetailOverlay";
import DashboardGrid from "./dashboard/DashboardGrid";
import { createDefaultBattlelogWidgets } from "./dashboard/default-dashboard";
import GridLinesOverlay from "./dashboard/GridLinesOverlay";
import TopBar from "./dashboard/TopBar";
import { useWidgetKeyboardShortcuts } from "./dashboard/use-widget-keyboard-shortcuts";
import WidgetConfigPanel from "./dashboard/WidgetConfigPanel";
import { useAutoSave } from "./hooks/use-auto-save";
import NotificationHost from "./notifications/NotificationHost";
import { useDashboardStore } from "./stores/dashboard-store";
import { registerAllWidgets } from "./widgets/register-all";

export function DashboardLayout() {
  const loadDashboards = useDashboardStore((state) => state.loadDashboards);

  useEffect(() => {
    registerAllWidgets();
    void loadDashboards();
  }, [loadDashboards]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
      <TopBar />
      <NotificationHost />
      <EventDetailOverlay />
      <div className="relative flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

export function NavigateToFirst() {
  const navigate = useNavigate();
  const createDashboard = useDashboardStore((state) => state.createDashboard);
  const dashboards = useDashboardStore((state) => state.dashboards);
  const dashboardError = useDashboardStore((state) => state.dashboardError);
  const hasLoadedDashboards = useDashboardStore((state) => state.hasLoadedDashboards);
  const loadDashboards = useDashboardStore((state) => state.loadDashboards);
  const didCreateDefault = useRef(false);

  useEffect(() => {
    if (!hasLoadedDashboards || dashboardError) return;

    if (dashboards.length > 0) {
      navigate(`/d/${dashboards[0].id}`, { replace: true });
      return;
    }

    if (didCreateDefault.current) return;
    didCreateDefault.current = true;
    void createDashboard("Battlelog Operations", createDefaultBattlelogWidgets())
      .then((id) => {
        navigate(`/d/${id}`, { replace: true });
      })
      .catch(() => {
        didCreateDefault.current = false;
      });
  }, [createDashboard, dashboardError, dashboards, hasLoadedDashboards, navigate]);

  if (dashboardError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-xl rounded border border-[var(--color-danger)]/40 bg-[var(--color-surface)] p-4 shadow">
          <h1 className="mb-2 text-lg font-semibold text-[var(--color-danger)]">
            Unable to load dashboards
          </h1>
          <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{dashboardError}</p>
          <button type="button" className="ll-btn" onClick={() => void loadDashboards()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-[var(--color-muted-foreground)]">Loading dashboard...</span>
    </div>
  );
}

export function DashboardPage() {
  const { dashboardId } = useParams();
  const navigate = useNavigate();
  const gridPreview = useDashboardStore((state) => state.gridPreview);
  const isEditMode = useDashboardStore((state) => state.isEditMode);
  const selectDashboard = useDashboardStore((state) => state.selectDashboard);

  useAutoSave();
  useWidgetKeyboardShortcuts(isEditMode);

  useEffect(() => {
    if (!dashboardId) return;
    selectDashboard(dashboardId).catch(() => {
      navigate("/", { replace: true });
    });
  }, [dashboardId, navigate, selectDashboard]);

  return (
    <>
      <DashboardGrid />
      {gridPreview && <GridLinesOverlay />}
      {isEditMode && <WidgetConfigPanel />}
    </>
  );
}
