import {
  Button,
  ButtonGroup,
  Dialog,
  DialogBody,
  DialogFooter,
  HTMLSelect,
  InputGroup,
  Navbar,
} from "@blueprintjs/core";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../hooks/use-theme";
import { useDashboardStore } from "../stores/dashboard-store";
import GridSettingsModal from "./GridSettingsModal";
import WidgetPalette from "./WidgetPalette";

export default function TopBar() {
  const {
    dashboards,
    activeDashboard,
    isEditMode,
    isDirty,
    isSaving,
    isLoading,
    toggleMode,
    createDashboard,
    deleteDashboard,
    deleteAllDashboards,
    saveDashboard,
    updateName,
  } = useDashboardStore();
  const navigate = useNavigate();

  const { isDark, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"single" | "all" | null>(null);

  const closeConfirm = () => setConfirmAction(null);
  const isDeleteAllConfirm = confirmAction === "all";
  const handleDashboardSelection = (event: ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value) navigate(`/d/${event.target.value}`);
  };

  const handleConfirmedDelete = async () => {
    if (isDeleteAllConfirm) {
      await deleteAllDashboards();
      closeConfirm();
      navigate("/", { replace: true });
      return;
    }

    if (!activeDashboard) return;

    await deleteDashboard(activeDashboard.id);
    closeConfirm();
    const current = useDashboardStore.getState().dashboards;
    if (current.length > 0) {
      navigate(`/d/${current[0].id}`);
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-12 items-center justify-center border-b border-[var(--color-separator)] bg-[var(--color-surface)]">
        <span className="text-sm text-[var(--color-muted-foreground)]">Loading...</span>
      </div>
    );
  }

  if (!isEditMode) {
    return (
      <Navbar className="!flex !h-8 !items-center !justify-between border-b border-[var(--color-separator)] !bg-[var(--color-surface)] !px-3">
        <Navbar.Group className="flex items-center gap-2">
          {dashboards.length > 0 && (
            <HTMLSelect
              aria-label="Select dashboard"
              className="text-xs"
              minimal
              options={dashboards.map((dashboard) => ({
                label: dashboard.name,
                value: dashboard.id,
              }))}
              value={activeDashboard?.id ?? ""}
              onChange={handleDashboardSelection}
            />
          )}
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {activeDashboard?.name}
          </span>
        </Navbar.Group>
        <Navbar.Group className="flex items-center gap-2">
          <Button variant="minimal" size="small" onClick={toggleTheme} className="text-xs">
            {isDark ? "Light" : "Dark"}
          </Button>
          <Button variant="minimal" size="small" onClick={toggleMode} className="text-xs">
            Edit
          </Button>
        </Navbar.Group>
      </Navbar>
    );
  }

  return (
    <>
      <Navbar className="!flex !h-12 !items-center !justify-between border-b border-[var(--color-separator)] !bg-[var(--color-surface)] !px-3">
        <Navbar.Group className="flex items-center gap-2">
          <HTMLSelect
            aria-label="Select dashboard"
            options={dashboards.map((dashboard) => ({
              label: dashboard.name,
              value: dashboard.id,
            }))}
            value={activeDashboard?.id ?? ""}
            onChange={handleDashboardSelection}
          />

          <Button variant="minimal" size="small" onClick={async () => {
            const id = await createDashboard();
            navigate(`/d/${id}`);
          }}>
            + New
          </Button>

          {activeDashboard && (
            <InputGroup
              className="max-w-52"
              value={activeDashboard.name}
              onChange={(e) => updateName(e.target.value)}
            />
          )}
        </Navbar.Group>

        <div className="flex items-center gap-2">
          <Button variant="minimal" size="small" onClick={toggleTheme} className="text-xs">
            {isDark ? "Light" : "Dark"}
          </Button>
        </div>
        <ButtonGroup>
          {activeDashboard && (
            <>
              <Button variant="outlined" size="small" onClick={() => setPaletteOpen(true)}>
                + Add Widget
              </Button>
              <Button variant="minimal" size="small" onClick={() => setSettingsOpen(true)}>
                Grid
              </Button>
              <Button
                intent="primary"
                size="small"
                onClick={saveDashboard}
                loading={isSaving}
              >
                {isDirty ? "Save*" : "Saved"}
              </Button>
              <Button
                variant="minimal"
                size="small"
                onClick={() => setConfirmAction("single")}
              >
                Delete
              </Button>
              <Button
                variant="minimal"
                size="small"
                onClick={() => setConfirmAction("all")}
              >
                Delete all
              </Button>
            </>
          )}
          <Button size="small" onClick={toggleMode}>
            View Mode
          </Button>
        </ButtonGroup>
      </Navbar>
      <WidgetPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <GridSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Dialog
        isOpen={confirmAction !== null}
        onClose={closeConfirm}
        title={isDeleteAllConfirm ? "Delete All Dashboards" : "Delete Dashboard"}
      >
        <DialogBody>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {isDeleteAllConfirm
              ? "Are you sure you want to delete all dashboards? This action cannot be undone."
              : `Are you sure you want to delete "${activeDashboard?.name}"? This action cannot be undone.`}
          </p>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button onClick={closeConfirm}>Cancel</Button>
              <Button intent="danger" onClick={handleConfirmedDelete}>
                {isDeleteAllConfirm ? "Delete all" : "Delete"}
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  );
}
