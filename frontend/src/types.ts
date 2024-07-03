export interface Event {
  id: number;
  header: string;
  link: string;
  source: string;
  admiralty_reliability: string;
  admiralty_accuracy: string;
  event_time: string;
  creation_time: string;
  keywords: string[];
  hcoe_domains: string[] | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
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
}
