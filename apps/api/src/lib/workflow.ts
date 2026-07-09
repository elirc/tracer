import type { StateType } from "@tracer/db";

/**
 * The default workflow every new team starts with. `type` is the stable spine (queries filter
 * on it); `name` is just the column label a team can rename later. Seeded in one transaction
 * with the team so a team always has a valid state to put issues in.
 */
export const DEFAULT_STATES: ReadonlyArray<{
  name: string;
  type: StateType;
  position: number;
  color: string;
}> = [
  { name: "Backlog", type: "BACKLOG", position: 0, color: "#8b93a1" },
  { name: "Todo", type: "UNSTARTED", position: 1, color: "#6b7280" },
  { name: "In Progress", type: "STARTED", position: 2, color: "#f5a623" },
  { name: "Done", type: "DONE", position: 3, color: "#2fbf71" },
  { name: "Canceled", type: "CANCELED", position: 4, color: "#6b7280" },
];
