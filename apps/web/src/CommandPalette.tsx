import { useMemo, useState, type CSSProperties } from "react";
import { useShortcut } from "./lib/keyboard";

export interface Command {
  id: string;
  label: string;
  run: () => void;
}

/**
 * Command palette v1. Cmd/Ctrl+K toggles it; a substring filter narrows the list (real frecency
 * ranking is Sprint 11). Every action a user can take should be reachable here — the palette is
 * the keyboard-first spine of the product.
 */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useShortcut("mod+k", "Open command palette", () => {
    setQ("");
    setOpen((o) => !o);
  });
  useShortcut("escape", "Close command palette", () => setOpen(false));

  const filtered = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())),
    [commands, q],
  );

  if (!open) return null;
  return (
    <div style={overlay} onClick={() => setOpen(false)}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          style={pInput}
          placeholder="Type a command…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {filtered.map((c) => (
          <button
            key={c.id}
            style={pItem}
            onClick={() => {
              c.run();
              setOpen(false);
            }}
          >
            {c.label}
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 12, color: "var(--muted)" }}>No commands.</div>
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
  width: 480,
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
