import type { Workspace } from "@tracer/shared";

/** Display label for a workspace in the sidebar/list. */
export function workspaceLabel(w: Workspace): string {
  return `${w.name} (${w.slug})`;
}
