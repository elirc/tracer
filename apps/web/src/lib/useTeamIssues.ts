import { useEffect, useState } from "react";
import type { MutationDelta } from "@tracer/shared";
import { apiGet } from "./api";
import { useSync } from "./sync";

export interface IssueDTO {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  sortOrder: string;
  state: { id: string; name: string; type: string };
  assignee: { name: string | null } | null;
}

/**
 * The issue list for a team, kept live by the sync engine. Initial state comes from REST; after
 * that, mutation deltas patch the SPECIFIC entity (create/update/delete) instead of refetching the
 * whole list. This is the harvest of flaw #1: no more invalidate-everything, and another client's
 * change lands here in real time. Delta application is idempotent, so replaying on reconnect is safe.
 */
export function useTeamIssues(teamId: string): IssueDTO[] {
  const [issues, setIssues] = useState<IssueDTO[]>([]);
  const { onDelta } = useSync();

  useEffect(() => {
    let active = true;
    apiGet<{ items: IssueDTO[] }>(`/api/v1/teams/${teamId}/issues?limit=100`).then((r) => {
      if (active) setIssues(r.items);
    });
    return () => {
      active = false;
    };
  }, [teamId]);

  useEffect(
    () =>
      onDelta((delta: MutationDelta) => {
        if (delta.entity !== "issue" || delta.teamId !== teamId) return;
        setIssues((cur) => applyDelta(cur, delta));
      }),
    [onDelta, teamId],
  );

  return issues;
}

function applyDelta(cur: IssueDTO[], delta: MutationDelta): IssueDTO[] {
  if (delta.op === "delete") return cur.filter((i) => i.id !== delta.entityId);
  const data = delta.data as IssueDTO;
  const idx = cur.findIndex((i) => i.id === delta.entityId);
  if (idx === -1) return [data, ...cur]; // create (or a replay we hadn't seen)
  const next = cur.slice();
  next[idx] = data; // update
  return next;
}
