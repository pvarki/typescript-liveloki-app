import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  NumericInput,
} from "@blueprintjs/core";
import { useEffect, useState } from "react";

import { useDashboardStore } from "../stores/dashboard-store";
import type { DashboardSettings } from "../types";
import {
  DASHBOARD_GAP_OPTIONS,
  DASHBOARD_PADDING_OPTIONS,
  DASHBOARD_WIDGET_BORDER_OPTIONS,
  DASHBOARD_WIDGET_HEADER_OPTIONS,
  DEFAULT_DASHBOARD_SETTINGS,
} from "./dashboard-settings";

interface GridSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatBorderLabel(value: DashboardSettings["widgetBorders"]): string {
  if (value === "none") return "None";
  if (value === "subtle") return "Subtle";
  return "Visible";
}

function formatHeaderLabel(value: DashboardSettings["widgetHeaders"]): string {
  if (value === "always") return "Always";
  if (value === "edit-only") return "Edit only";
  return "Never";
}

export default function GridSettingsModal({ isOpen, onClose }: GridSettingsModalProps) {
  const { activeDashboard, updateGridConfig, setGridPreview } = useDashboardStore();
  const [cols, setCols] = useState(activeDashboard?.cols ?? 24);
  const [rowHeight, setRowHeight] = useState(activeDashboard?.rowHeight ?? 50);
  const [settings, setSettings] = useState<DashboardSettings>(
    activeDashboard?.settings ?? DEFAULT_DASHBOARD_SETTINGS,
  );

  useEffect(() => {
    if (isOpen) {
      setCols(activeDashboard?.cols ?? 24);
      setRowHeight(activeDashboard?.rowHeight ?? 50);
      setSettings(activeDashboard?.settings ?? DEFAULT_DASHBOARD_SETTINGS);
    }
  }, [isOpen, activeDashboard?.cols, activeDashboard?.rowHeight, activeDashboard?.settings]);

  useEffect(() => {
    if (isOpen) {
      setGridPreview({ cols, rowHeight, settings });
    }
  }, [isOpen, cols, rowHeight, setGridPreview, settings]);

  const handleClose = () => {
    setGridPreview(null);
    onClose();
  };

  const handleSave = () => {
    updateGridConfig(cols, rowHeight, settings);
    setGridPreview(null);
    onClose();
  };

  const patchSettings = <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Dashboard Settings">
      <DialogBody className="flex flex-col gap-4">
        <FormGroup label="Columns">
          <NumericInput
            value={cols}
            onValueChange={(value) => setCols(Number.isFinite(value) ? value : 24)}
            min={6}
            max={48}
            fill
          />
        </FormGroup>
        <FormGroup label="Row Height (px)">
          <NumericInput
            value={rowHeight}
            onValueChange={(value) => setRowHeight(Number.isFinite(value) ? value : 50)}
            min={20}
            max={200}
            fill
          />
        </FormGroup>
        <FormGroup label="Gap (px)">
          <HTMLSelect
            fill
            value={settings.gap}
            onChange={(event) =>
              patchSettings("gap", Number(event.currentTarget.value) as DashboardSettings["gap"])
            }
          >
            {DASHBOARD_GAP_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>
        <FormGroup label="Padding (px)">
          <HTMLSelect
            fill
            value={settings.padding}
            onChange={(event) =>
              patchSettings(
                "padding",
                Number(event.currentTarget.value) as DashboardSettings["padding"],
              )
            }
          >
            {DASHBOARD_PADDING_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>
        <FormGroup label="Widget Borders">
          <HTMLSelect
            fill
            value={settings.widgetBorders}
            onChange={(event) =>
              patchSettings(
                "widgetBorders",
                event.currentTarget.value as DashboardSettings["widgetBorders"],
              )
            }
          >
            {DASHBOARD_WIDGET_BORDER_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatBorderLabel(value)}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>
        <FormGroup label="Widget Headers">
          <HTMLSelect
            fill
            value={settings.widgetHeaders}
            onChange={(event) =>
              patchSettings(
                "widgetHeaders",
                event.currentTarget.value as DashboardSettings["widgetHeaders"],
              )
            }
          >
            {DASHBOARD_WIDGET_HEADER_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatHeaderLabel(value)}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button intent="primary" onClick={handleSave}>
              Save
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
