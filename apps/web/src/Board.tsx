import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiPatch } from "./lib/api";
import { useTeamIssues } from "./lib/useTeamIssues";

interface StateRow {
  id: string;
  name: string;
  color: string;
}

export function Board({ teamId }: { teamId: string }) {
  const { issues } = useTeamIssues(teamId); // live + offline-first: deltas patch this list
  const [states, setStates] = useState<StateRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<StateRow[]>(`/api/v1/teams/${teamId}/workflow-states`).then(setStates);
  }, [teamId]);

  const inState = (stateId: string) =>
    issues.filter((i) => i.state.id === stateId).sort((a, b) => (a.sortOrder < b.sortOrder ? -1 : 1));

  // A drop calls the move API. We DON'T reload — the resulting delta arrives over the socket and
  // patches the board for every connected client, including this one. Real-time by construction.
  const move = async (stateId: string, afterId: string | null) => {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    await apiPatch(`/api/v1/issues/${id}/move`, { stateId, afterId });
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
