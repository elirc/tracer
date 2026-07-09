import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "./lib/api";

interface StateRow {
  id: string;
  name: string;
  type: string;
  color: string;
}
interface IssueRow {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  state: { id: string; name: string; type: string };
  assignee: { name: string | null; email: string } | null;
}

const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

export function IssuesPanel({ teamId }: { teamId: string }) {
  const [states, setStates] = useState<StateRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [title, setTitle] = useState("");

  // The deliberate "classic" mutation layer (ADR-0002): after ANY change we refetch the WHOLE
  // list. Correct but crude — this invalidate-everything approach is exactly what the sync engine
  // in Sprint 06-07 replaces with targeted, real-time updates. Open the network tab and count the
  // refetches per edit: that cost is why this course exists.
  const reload = async () => {
    const [s, i] = await Promise.all([
      apiGet<StateRow[]>(`/api/v1/teams/${teamId}/workflow-states`),
      apiGet<{ items: IssueRow[] }>(`/api/v1/teams/${teamId}/issues`),
    ]);
    setStates(s);
    setIssues(i.items);
  };
  useEffect(() => {
    void reload();
  }, [teamId]);

  const create = async () => {
    if (!title.trim()) return;
    await apiPost(`/api/v1/teams/${teamId}/issues`, { title: title.trim() });
    setTitle("");
    await reload();
  };

  const patch = async (id: string, data: Record<string, unknown>) => {
    await apiPatch(`/api/v1/issues/${id}`, data);
    await reload();
  };

  const remove = async (id: string) => {
    await apiDelete(`/api/v1/issues/${id}`);
    await reload();
  };

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
