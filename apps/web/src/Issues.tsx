import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "./lib/api";
import { useTeamIssues } from "./lib/useTeamIssues";

interface StateRow {
  id: string;
  name: string;
  type: string;
  color: string;
}

const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

export function IssuesPanel({ teamId }: { teamId: string }) {
  const issues = useTeamIssues(teamId); // live: no more invalidate-everything (flaw #1 harvested)
  const [states, setStates] = useState<StateRow[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    void apiGet<StateRow[]>(`/api/v1/teams/${teamId}/workflow-states`).then(setStates);
  }, [teamId]);

  // Mutations just call the API. The delta comes back over the socket and patches the list — for
  // this client and every other one. No reload() anywhere.
  const create = async () => {
    if (!title.trim()) return;
    await apiPost(`/api/v1/teams/${teamId}/issues`, { title: title.trim() });
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
        <div key={i.id} style={row}>
          <code style={{ color: "var(--muted)", minWidth: 72 }}>{i.identifier}</code>
          <span style={{ flex: 1 }}>{i.title}</span>
          <select
            style={select}
            value={i.state.id}
            onChange={(e) => void patch(i.id, { stateId: e.target.value })}
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
            onChange={(e) => void patch(i.id, { priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.toLowerCase()}
              </option>
            ))}
          </select>
          <button style={ghost} onClick={() => void remove(i.id)} title="Delete">
            ✕
          </button>
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
