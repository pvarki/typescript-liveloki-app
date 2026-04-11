import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

import EventDetailOverlay from "./battlelog/EventDetailOverlay";
import DashboardGrid from "./dashboard/DashboardGrid";
import { createDefaultBattlelogWidgets } from "./dashboard/default-dashboard";
import GridLinesOverlay from "./dashboard/GridLinesOverlay";
import TopBar from "./dashboard/TopBar";
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
  const hasLoadedDashboards = useDashboardStore((state) => state.hasLoadedDashboards);
  const didCreateDefault = useRef(false);

  useEffect(() => {
    if (!hasLoadedDashboards) return;

    if (dashboards.length > 0) {
      navigate(`/d/${dashboards[0].id}`, { replace: true });
      return;
    }

    if (didCreateDefault.current) return;
    didCreateDefault.current = true;
    void createDashboard("Battlelog Operations", createDefaultBattlelogWidgets()).then((id) => {
      navigate(`/d/${id}`, { replace: true });
    });
  }, [createDashboard, dashboards, hasLoadedDashboards, navigate]);

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
