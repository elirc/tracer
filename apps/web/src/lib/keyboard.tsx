import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

type Handler = (e: KeyboardEvent) => void;
export interface Binding {
  combo: string; // e.g. "mod+k", "shift+?", "c"
  description: string;
  handler: Handler;
}

interface Registry {
  register: (b: Binding) => () => void;
  list: () => Binding[];
}

const Ctx = createContext<Registry | null>(null);

/** Normalize a keyboard event to a combo string. `mod` = Cmd on macOS / Ctrl elsewhere. */
export function comboOf(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("mod");
  if (e.shiftKey) parts.push("shift");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

/**
 * A single global keyboard registry. Shortcuts register/unregister as components mount, so the
 * active set always mirrors what's on screen. (v1 is a flat registry; scoped stacks —
 * global/list/board/detail — arrive with the editor work. The one rule already here: don't fire
 * plain keys while typing in an input, but DO allow `mod`-based combos like Cmd+K.)
 */
export function KeyboardProvider({ children }: { children: ReactNode }) {
  const bindings = useRef<Set<Binding>>(new Set());

  const register = useCallback((b: Binding) => {
    bindings.current.add(b);
    return () => {
      bindings.current.delete(b);
    };
  }, []);

  const list = useCallback(() => [...bindings.current], []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const combo = comboOf(e);
      for (const b of bindings.current) {
        if (b.combo !== combo) continue;
        if (typing && !combo.startsWith("mod")) continue;
        e.preventDefault();
        b.handler(e);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <Ctx.Provider value={{ register, list }}>{children}</Ctx.Provider>;
}

export function useShortcut(combo: string, description: string, handler: Handler): void {
  const reg = useContext(Ctx);
  useEffect(() => {
    if (!reg) return;
    return reg.register({ combo, description, handler });
  }, [reg, combo, description, handler]);
}

export function useRegistry(): Registry | null {
  return useContext(Ctx);
}
