export type PersonState = "in" | "out";

export interface CheckpointPerson {
  slug: string;
  displayName: string;
  since: string;
}
