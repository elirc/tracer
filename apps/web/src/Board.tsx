import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiPatch } from "./lib/api";

interface StateRow {
  id: string;
  name: string;
  color: string;
}
interface IssueRow {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  sortOrder: string;
  state: { id: string };
}

export function Board({ teamId }: { teamId: string }) {
  const [states, setStates] = useState<StateRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const reload = async () => {
    const [s, i] = await Promise.all([
      apiGet<StateRow[]>(`/api/v1/teams/${teamId}/workflow-states`),
      apiGet<{ items: IssueRow[] }>(`/api/v1/teams/${teamId}/issues?limit=100`),
    ]);
    setStates(s);
    setIssues(i.items);
  };
  useEffect(() => {
    void reload();
  }, [teamId]);

  const inState = (stateId: string) =>
    issues.filter((i) => i.state.id === stateId).sort((a, b) => (a.sortOrder < b.sortOrder ? -1 : 1));

  // A drop = one move mutation: server computes the sortOrder key between neighbours (one row
  // written). afterId=null means "top of the column". Then reload (still invalidate-everything — the
  // sync engine in S06-07 makes this incremental).
  const move = async (stateId: string, afterId: string | null) => {
    if (!dragId) return;
    await apiPatch(`/api/v1/issues/${dragId}/move`, { stateId, afterId });
    setDragId(null);
    await reload();
  };

  return (
    <div style={{ display: "flex", gap: 12, marginTop: 16, overflowX: "auto" }}>
      {states.map((s) => {
        const cards = inState(s.id);
        return (
          <div
            key={s.id}
            style={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void move(s.id, cards.at(-1)?.id ?? null)}
          >
            <div style={{ color: s.color, fontWeight: 600, marginBottom: 8 }}>
              {s.name} <span style={{ color: "var(--muted)" }}>{cards.length}</span>
            </div>
            {cards.map((i, idx) => (
              <div
                key={i.id}
                draggable
                onDragStart={() => setDragId(i.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  void move(s.id, cards[idx - 1]?.id ?? null);
                }}
                style={card}
              >
                <code style={{ color: "var(--muted)", fontSize: 11 }}>{i.identifier}</code>
                <div>{i.title}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const col: CSSProperties = {
  minWidth: 220,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 10,
};
const card: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  marginBottom: 8,
  cursor: "grab",
};
