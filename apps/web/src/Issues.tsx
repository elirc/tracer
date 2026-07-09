import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiPatch, apiDelete } from "./lib/api";
import { useTeamIssues } from "./lib/useTeamIssues";
import { useUndo } from "./lib/undo";
import { useToast } from "./lib/toast";
import { Comments } from "./Comments";

interface StateRow {
  id: string;
  name: string;
  type: string;
  color: string;
}

const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

export function IssuesPanel({ teamId }: { teamId: string }) {
  const { issues, createIssue } = useTeamIssues(teamId); // offline-first store (flaw #1 harvested)
  const { push } = useUndo();
  const { show } = useToast();
  const [states, setStates] = useState<StateRow[]>([]);
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<StateRow[]>(`/api/v1/teams/${teamId}/workflow-states`).then(setStates);
  }, [teamId]);

  // Create goes through the store: optimistic overlay + client mutationId (server dedupes on retry).
  // Edits/deletes call the API; the returned delta patches the list for every client.
  const create = async () => {
    if (!title.trim()) return;
    await createIssue(title.trim());
    setTitle("");
  };
  const patch = (id: string, data: Record<string, unknown>) => apiPatch(`/api/v1/issues/${id}`, data);
  const remove = (id: string) => apiDelete(`/api/v1/issues/${id}`);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={input}
          placeholder="New issue title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void create();
          }}
        />
        <button style={button} onClick={() => void create()}>
          Add issue
        </button>
      </div>
      {issues.length === 0 && <p style={{ color: "var(--muted)" }}>No issues yet.</p>}
      {issues.map((i) => (
        <div key={i.id}>
          <div style={row}>
          <code style={{ color: "var(--muted)", minWidth: 72 }}>{i.identifier}</code>
          <span style={{ flex: 1 }}>{i.title}</span>
          <select
            style={select}
            value={i.state.id}
            onChange={(e) => {
              const old = i.state.id;
              const next = e.target.value;
              void patch(i.id, { stateId: next });
              push({
                label: `state of ${i.identifier}`,
                undo: () => patch(i.id, { stateId: old }),
                redo: () => patch(i.id, { stateId: next }),
              });
            }}
          >
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            style={select}
            value={i.priority}
            onChange={(e) => {
              const old = i.priority;
              const next = e.target.value;
              void patch(i.id, { priority: next });
              push({
                label: `priority of ${i.identifier}`,
                undo: () => patch(i.id, { priority: old }),
                redo: () => patch(i.id, { priority: next }),
              });
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.toLowerCase()}
              </option>
            ))}
          </select>
          <button
            style={ghost}
            onClick={() => setExpanded(expanded === i.id ? null : i.id)}
            title="Comments"
          >
            💬
          </button>
          <button
            style={ghost}
            onClick={() => {
              void remove(i.id);
              show(`Deleted ${i.identifier} — Cmd/Ctrl+Z to undo`);
              push({
                label: `delete ${i.identifier}`,
                undo: () => apiPatch(`/api/v1/issues/${i.id}/restore`, {}),
                redo: () => remove(i.id),
              });
            }}
            title="Delete"
          >
            ✕
          </button>
          </div>
          {expanded === i.id && <Comments issueId={i.id} />}
        </div>
      ))}
    </div>
  );
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderTop: "1px solid var(--border)",
};
const input: CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  flex: 1,
};
const button: CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
};
const select: CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "4px 6px",
};
const ghost: CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "none",
  cursor: "pointer",
};
