export const GRID_DRAG_HANDLE_SELECTOR = ".cursor-grab";
export const GRID_DRAG_CANCEL_SELECTOR =
  ".weather-map-container, .weather-map-container *";
export const GRID_ALLOW_OVERLAP = true;
export const GRID_PREVENT_COLLISION = true;

export function shouldPersistGridLayoutChange(
  trigger: "layout-change" | "drag-stop" | "resize-stop"
): boolean {
  return trigger === "drag-stop" || trigger === "resize-stop";
}
