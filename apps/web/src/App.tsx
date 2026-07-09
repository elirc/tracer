import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiPost, loginUrl } from "./lib/api";
import { useSession } from "./lib/session";
import { useSync } from "./lib/sync";
import { usePresence } from "./lib/usePresence";
import { IssuesPanel } from "./Issues";
import { Board } from "./Board";
import { CommandPalette, type Command } from "./CommandPalette";
import { MyIssues } from "./MyIssues";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  role: string;
}
interface TeamRow {
  id: string;
  name: string;
  key: string;
}

export function App() {
  const { user, loading, refresh } = useSession();

  if (loading) return <Shell>Loading…</Shell>;
  if (!user) {
    return (
      <Shell>
        <p style={{ color: "var(--muted)" }}>Sign in to continue.</p>
        <a style={button} href={loginUrl}>
          Sign in (dev)
        </a>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>
          Signed in as <strong>{user.name ?? user.email}</strong>
        </span>
        <button
          style={ghostButton}
          onClick={() => apiPost("/auth/logout").then(refresh)}
        >
          Log out
        </button>
      </div>
      <section style={panel}>
        <h2>My Issues</h2>
        <MyIssues />
      </section>
      <Workspaces />
    </Shell>
  );
}

function Workspaces() {
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [selected, setSelected] = useState<WorkspaceRow | null>(null);
  const [name, setName] = useState("");

  const load = () =>
    apiGet<WorkspaceRow[]>("/api/v1/workspaces").then((r) => {
      setRows(r);
      setSelected((s) => s ?? r[0] ?? null);
    });
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await apiPost<WorkspaceRow>("/api/v1/workspaces", { name: name.trim(), slug });
    setName("");
    await load();
  };

  return (
    <section style={panel}>
      <h2>Workspaces</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rows.map((w) => (
          <button
            key={w.id}
            style={{ ...chip, ...(selected?.id === w.id ? chipActive : {}) }}
            onClick={() => setSelected(w)}
          >
            {w.name} · <span style={{ color: "var(--muted)" }}>{w.role}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          style={input}
          placeholder="New workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button style={button} onClick={() => void create()}>
          Create
        </button>
      </div>
      {selected && <Teams workspace={selected} />}
    </section>
  );
}

function Teams({ workspace }: { workspace: WorkspaceRow }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selected, setSelected] = useState<TeamRow | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const { subscribeWorkspace } = useSync();

  const load = () =>
    apiGet<TeamRow[]>(`/api/v1/workspaces/${workspace.id}/teams`).then((t) => {
      setTeams(t);
      setSelected((s) => t.find((x) => x.id === s?.id) ?? t[0] ?? null);
    });
  useEffect(() => {
    void load();
  }, [workspace.id]);
  // Point the single sync connection at this workspace — deltas for its issues now stream in.
  useEffect(() => subscribeWorkspace(workspace.id), [workspace.id, subscribeWorkspace]);

  const create = async () => {
    if (!name.trim() || !/^[A-Z]{2,6}$/.test(key)) return;
    await apiPost(`/api/v1/workspaces/${workspace.id}/teams`, { name: name.trim(), key });
    setName("");
    setKey("");
    await load();
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3>
        Teams in {workspace.name}{" "}
        <span style={{ color: "var(--muted)", fontWeight: 400 }}>({workspace.role})</span>
      </h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {teams.map((t) => (
          <button
            key={t.id}
            style={{ ...chip, ...(selected?.id === t.id ? chipActive : {}) }}
            onClick={() => setSelected(t)}
          >
            <code>{t.key}</code> {t.name}
          </button>
        ))}
        {teams.length === 0 && <span style={{ color: "var(--muted)" }}>No teams visible.</span>}
      </div>
      {workspace.role === "ADMIN" && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input style={input} placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            style={{ ...input, width: 90 }}
            placeholder="KEY"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
          />
          <button style={button} onClick={() => void create()}>
            Add team
          </button>
        </div>
      )}
      {selected && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
            <button style={view === "list" ? button : ghostButton} onClick={() => setView("list")}>
              List
            </button>
            <button style={view === "board" ? button : ghostButton} onClick={() => setView("board")}>
              Board
            </button>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>⌘K for commands</span>
            <TeamPresence teamId={selected.id} />
          </div>
          {view === "list" ? <IssuesPanel teamId={selected.id} /> : <Board teamId={selected.id} />}
          <CommandPalette
            commands={
              [
                { id: "list", label: "View: List", run: () => setView("list") },
                { id: "board", label: "View: Board", run: () => setView("board") },
              ] satisfies Command[]
            }
          />
        </>
      )}
    </div>
  );
}

function TeamPresence({ teamId }: { teamId: string }) {
  const viewers = usePresence(teamId);
  if (viewers.length === 0) return null;
  return (
    <span style={{ color: "var(--ok)", fontSize: 12 }} title="Also viewing (live presence)">
      👁 {viewers.join(", ")}
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ color: "var(--accent)" }}>Tracer</h1>
      {children}
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
  textDecoration: "none",
  display: "inline-block",
};
const ghostButton: CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};
const chip: CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
};
const chipActive: CSSProperties = { borderColor: "var(--accent)", color: "var(--accent)" };
const input: CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
};
