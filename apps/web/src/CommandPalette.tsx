import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { fuzzyMatch } from "@tracer/shared";
import { useShortcut } from "./lib/keyboard";
import { apiGet } from "./lib/api";

export interface Command {
  id: string;
  label: string;
  run: () => void;
}
interface IssueResult {
  id: string;
  identifier: string;
  title: string;
  teamId: string;
}

const FRECENCY_KEY = "tracer:frecency";
function loadFrecency(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FRECENCY_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}
function bump(id: string): void {
  const f = loadFrecency();
  f[id] = (f[id] ?? 0) + 1;
  localStorage.setItem(FRECENCY_KEY, JSON.stringify(f));
}

/**
 * Command palette v2 (S11). Two systems merged so the user never sees the seam:
 *  - INSTANT + LOCAL: fuzzy-rank the command list, boosted by frecency (your most-used float up).
 *  - THOROUGH + REMOTE: a debounced server search for issues across your teams.
 * Cmd/Ctrl+K toggles it.
 */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [issues, setIssues] = useState<IssueResult[]>([]);

  useShortcut("mod+k", "Open command palette", () => {
    setQ("");
    setIssues([]);
    setOpen((o) => !o);
  });
  useShortcut("escape", "Close command palette", () => setOpen(false));

  const rankedCommands = useMemo(() => {
    const frecency = loadFrecency();
    return commands
      .map((c) => {
        const m = q ? fuzzyMatch(q, c.label) : { score: 0, indices: [] };
        return m ? { c, score: m.score + (frecency[c.id] ?? 0) * 2 } : null;
      })
      .filter((x): x is { c: Command; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);
  }, [commands, q]);

  // Debounced server search — the long tail the local store hasn't loaded.
  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setIssues([]);
      return;
    }
    const t = window.setTimeout(() => {
      void apiGet<IssueResult[]>(`/api/v1/search?q=${encodeURIComponent(q.trim())}`)
        .then(setIssues)
        .catch(() => setIssues([]));
    }, 150);
    return () => window.clearTimeout(t);
  }, [q, open]);

  if (!open) return null;
  return (
    <div style={overlay} onClick={() => setOpen(false)}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          style={pInput}
          placeholder="Search issues or type a command…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {rankedCommands.map(({ c }) => (
          <button
            key={c.id}
            style={pItem}
            onClick={() => {
              bump(c.id);
              c.run();
              setOpen(false);
            }}
          >
            ⌘ {c.label}
          </button>
        ))}
        {issues.length > 0 && <div style={sectionLabel}>Issues</div>}
        {issues.map((i) => (
          <button key={i.id} style={pItem} onClick={() => setOpen(false)}>
            <code style={{ color: "var(--muted)" }}>{i.identifier}</code> {i.title}
          </button>
        ))}
        {rankedCommands.length === 0 && issues.length === 0 && (
          <div style={{ padding: 12, color: "var(--muted)" }}>No results.</div>
        )}
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingTop: "12vh",
  zIndex: 50,
};
const box: CSSProperties = {
  width: 520,
  maxWidth: "90vw",
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
const pInput: CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  color: "var(--text)",
  border: "none",
  borderBottom: "1px solid var(--border)",
  padding: "14px 16px",
  fontSize: 15,
  outline: "none",
};
const pItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  color: "var(--text)",
  border: "none",
  padding: "10px 16px",
  cursor: "pointer",
  fontSize: 14,
};
const sectionLabel: CSSProperties = {
  padding: "8px 16px 2px",
  fontSize: 11,
  textTransform: "uppercase",
  color: "var(--muted)",
};
