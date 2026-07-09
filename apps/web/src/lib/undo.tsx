import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { useShortcut } from "./keyboard";
import { useToast } from "./toast";

export interface UndoEntry {
  label: string;
  undo: () => Promise<unknown> | void;
  redo: () => Promise<unknown> | void;
}

interface UndoCtx {
  push: (entry: UndoEntry) => void;
}

const Ctx = createContext<UndoCtx>({ push: () => {} });

/**
 * A per-user undo/redo stack. Each entry knows how to invert itself (`undo`) and re-apply (`redo`).
 * Undo of `set(state, B, was A)` is just `set(state, A)` — an ordinary mutation, so it flows through
 * the same sync pipeline: an undo appears on every client, and (thanks to S07) would work offline.
 *
 * You can only undo YOUR OWN actions — the stack is per-client. Undoing a colleague's edit would be
 * an act of aggression, so the model simply can't express it.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const { show } = useToast();

  const push = useCallback((entry: UndoEntry) => {
    undoStack.current.push(entry);
    redoStack.current = []; // a fresh action invalidates the redo branch
  }, []);

  useShortcut("mod+z", "Undo", () => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    void Promise.resolve(entry.undo());
    redoStack.current.push(entry);
    show(`Undid: ${entry.label}`);
  });

  useShortcut("mod+shift+z", "Redo", () => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    void Promise.resolve(entry.redo());
    undoStack.current.push(entry);
    show(`Redid: ${entry.label}`);
  });

  return <Ctx.Provider value={{ push }}>{children}</Ctx.Provider>;
}

export const useUndo = () => useContext(Ctx);
