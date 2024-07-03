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
  keywords: string;
}
