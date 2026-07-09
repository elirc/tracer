import { useEffect, useState, type CSSProperties } from "react";
import { apiGet } from "./lib/api";

interface Row {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  state: { name: string; type: string };
  team: { name: string };
}

// A canned "My Issues" view (assigned to me, any team). Note the three explicit states —
// loading (null), empty ([]), and populated. Handling all three is table stakes; forgetting the
// empty state is the most common UX gap.
export function MyIssues() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    apiGet<Row[]>("/api/v1/me/issues")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (rows === null) return <p style={{ color: "var(--muted)" }}>Loading your issues…</p>;
  if (rows.length === 0)
    return <p style={{ color: "var(--muted)" }}>Nothing assigned to you yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {rows.map((r) => (
        <li key={r.id} style={li}>
          <code style={{ color: "var(--muted)", minWidth: 72 }}>{r.identifier}</code>
          <span style={{ flex: 1 }}>{r.title}</span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            {r.state.name} · {r.team.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

const li: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  borderTop: "1px solid var(--border)",
};
