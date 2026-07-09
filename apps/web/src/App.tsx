import { useEffect, useState, type CSSProperties } from "react";
import { WorkspaceListSchema, type Workspace } from "@tracer/shared";
import { useEcho } from "./lib/useWs";
import { workspaceLabel } from "./lib/format";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws";

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { status, lastEcho, sendEcho } = useEcho(WS_URL);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/workspaces`)
      .then((r) => r.json())
      .then((data: unknown) => setWorkspaces(WorkspaceListSchema.parse(data)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ color: "var(--accent)" }}>Tracer</h1>
      <p style={{ color: "var(--muted)" }}>Walking skeleton — Sprint 01 (DB → API → UI + WS echo).</p>

      <section style={panel}>
        <h2>Workspaces</h2>
        {error && <p style={{ color: "salmon" }}>Failed to load: {error}</p>}
        {!error && workspaces.length === 0 && (
          <p style={{ color: "var(--muted)" }}>
            No workspaces yet — run <code>pnpm db:up &amp;&amp; pnpm db:seed</code>.
          </p>
        )}
        <ul>
          {workspaces.map((w) => (
            <li key={w.id}>{workspaceLabel(w)}</li>
          ))}
        </ul>
      </section>

      <section style={panel}>
        <h2>WebSocket echo</h2>
        <p>
          Status:{" "}
          <strong style={{ color: status === "open" ? "var(--ok)" : "var(--muted)" }}>
            {status}
          </strong>
        </p>
        <button style={button} onClick={() => sendEcho(`ping @ ${new Date().toLocaleTimeString()}`)}>
          Send echo
        </button>
        {lastEcho && (
          <p style={{ color: "var(--muted)" }}>
            Echoed back: <code>{lastEcho.payload}</code>
          </p>
        )}
      </section>
    </main>
  );
}

const panel: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 16,
  marginTop: 16,
};

const button: CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
};
