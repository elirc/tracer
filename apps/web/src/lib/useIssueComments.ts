import { useCallback, useEffect, useState } from "react";
import type { MutationDelta } from "@tracer/shared";
import { apiGet, apiPost } from "./api";
import { useSync } from "./sync";

export interface CommentDTO {
  id: string;
  issueId: string;
  body: string;
  author: { id: string; name: string | null; email: string };
  createdAt: string;
}

/**
 * Comments for an issue, kept live by the SAME sync engine as issues — zero new infrastructure.
 * Comment deltas ride the mutation log; we just filter for `entity === "comment"`. That a whole
 * feature lands with no new sync code is the proof that the S06 spine was worth building.
 */
export function useIssueComments(issueId: string): {
  comments: CommentDTO[];
  addComment: (body: string) => Promise<void>;
} {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const { onDelta } = useSync();

  useEffect(() => {
    let active = true;
    void apiGet<CommentDTO[]>(`/api/v1/issues/${issueId}/comments`).then((c) => {
      if (active) setComments(c);
    });
    return () => {
      active = false;
    };
  }, [issueId]);

  useEffect(
    () =>
      onDelta((delta: MutationDelta) => {
        if (delta.entity !== "comment" || delta.op !== "create") return;
        const data = delta.data as CommentDTO | null;
        if (!data || data.issueId !== issueId) return;
        setComments((cur) => (cur.some((c) => c.id === data.id) ? cur : [...cur, data]));
      }),
    [onDelta, issueId],
  );

  const addComment = useCallback(
    async (body: string) => {
      // Fire the mutation; the create delta adds it (idempotent guard above prevents a double).
      await apiPost(`/api/v1/issues/${issueId}/comments`, { body });
    },
    [issueId],
  );

  return { comments, addComment };
}
