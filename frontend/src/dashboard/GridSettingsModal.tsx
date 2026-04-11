import { Button, Dialog, DialogBody, DialogFooter, FormGroup, NumericInput } from "@blueprintjs/core";
import { useEffect,useState } from "react";

import { useDashboardStore } from "../stores/dashboard-store";

interface GridSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GridSettingsModal({ isOpen, onClose }: GridSettingsModalProps) {
  const { activeDashboard, updateGridConfig, setGridPreview } = useDashboardStore();
  const [cols, setCols] = useState(activeDashboard?.cols ?? 24);
  const [rowHeight, setRowHeight] = useState(activeDashboard?.rowHeight ?? 50);

  useEffect(() => {
    if (isOpen) {
      setCols(activeDashboard?.cols ?? 24);
      setRowHeight(activeDashboard?.rowHeight ?? 50);
    }
  }, [isOpen, activeDashboard?.cols, activeDashboard?.rowHeight]);

  useEffect(() => {
    if (isOpen) {
      setGridPreview({ cols, rowHeight });
    }
  }, [isOpen, cols, rowHeight, setGridPreview]);

  const handleClose = () => {
    setGridPreview(null);
    onClose();
  };

  const handleSave = () => {
    updateGridConfig(cols, rowHeight);
    setGridPreview(null);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Grid Settings">
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
