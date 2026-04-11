import type { FC, ReactNode } from "react";

export interface Event {
  id: number | string;
  header: string;
  link: string;
  source: string;
  admiralty_reliability: string;
  admiralty_accuracy: string;
  event_time: string;
  creation_time: string;
  keywords: string[];
  images: string[] | null;
  hcoe_domains: string[] | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  author: string;
  groups?: string[];
  notes?: string;
}

export interface FilteredEvent extends Event {
  alert?: boolean;
}

export interface EventPayload {
  header: string;
  link: string;
  source: string;
  admiralty_reliability: string;
  admiralty_accuracy: string;
  event_time: string;
  keywords: string[];
  hcoe_domains: string[];
  location: string;
  location_lat?: number;
  location_lng?: number;
  author: string;
  notes?: string;
}

export interface Group {
  group_name: string;
  event_count: number;
}

export interface LngLatData {
  lat: number;
  lng: number;
}

export interface DashboardData {
  id: string;
  name: string;
  cols: number;
  rowHeight: number;
  settings?: unknown;
  layout: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSettings {
  gap: 0 | 2 | 4 | 8;
  padding: 0 | 4 | 8 | 16;
  widgetBorders: "none" | "subtle" | "visible";
  widgetHeaders: "always" | "edit-only" | "never";
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetInstance {
  id: string;
  type: string;
  gridPosition: GridPosition;
  config: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  cols: number;
  rowHeight: number;
  settings: DashboardSettings;
  widgets: WidgetInstance[];
}

export interface WidgetDescriptor {
  type: string;
  name: string;
  description: string;
  icon: ReactNode;
  defaultSize: { w: number; h: number; minW: number; minH: number };
  defaultConfig: Record<string, unknown>;
  component: FC<WidgetProps>;
  configPanel?: FC<ConfigPanelProps>;
  needsScroll?: boolean;
}

export interface WidgetProps {
  instanceId: string;
  config: Record<string, unknown>;
  isEditMode: boolean;
  onChange?: (config: Record<string, unknown>) => void;
}

export interface ConfigPanelProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}
