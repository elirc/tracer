import { useState, type CSSProperties } from "react";
import { useShortcut, useRegistry } from "./lib/keyboard";

/**
 * The keyboard-shortcut help overlay (press `?`). It is GENERATED from the registry — every shortcut
 * that registered itself via `useShortcut` appears here automatically. Never hand-list shortcuts: a
 * hand-written list rots the moment someone adds a binding and forgets to update the docs. The
 * registry is the single source of truth for both behavior and discoverability.
 */
export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const registry = useRegistry();

  useShortcut("shift+?", "Show keyboard shortcuts", () => setOpen((o) => !o));
  useShortcut("escape", "Close keyboard shortcuts", () => setOpen(false));

  if (!open || !registry) return null;
  // Dedupe by combo: several components may register the same key (e.g. `escape`); show each once.
  const seen = new Set<string>();
  const bindings = registry.list().filter((b) => {
    if (!b.description || seen.has(b.combo)) return false;
    seen.add(b.combo);
    return true;
  });

  return (
    <div
      style={overlay}
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Keyboard shortcuts</h2>
        {bindings.map((b, i) => (
          <div key={i} style={rowStyle}>
            <span>{b.description}</span>
            <kbd style={kbd}>{b.combo.replace("mod", "⌘/Ctrl")}</kbd>
          </div>
        ))}
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
  alignItems: "center",
  zIndex: 60,
};
const box: CSSProperties = {
  width: 420,
  maxWidth: "90vw",
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};
const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "5px 0",
  fontSize: 14,
};
const kbd: CSSProperties = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "2px 6px",
};
