import { createContext, useCallback, useContext, useState, type ReactNode, type CSSProperties } from "react";

type Kind = "info" | "error";
interface Toast {
  id: number;
  message: string;
  kind: Kind;
}
interface ToastCtx {
  show: (message: string, kind?: Kind) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {/* A polite live region: screen readers announce toasts (and, via useToast, live collaborative
          updates) without stealing focus. This is how a real-time app stays accessible — S14. */}
      <div style={wrap} role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} style={{ ...toast, ...(t.kind === "error" ? errorToast : {}) }}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const wrap: CSSProperties = {
  position: "fixed",
  bottom: 16,
  right: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  zIndex: 100,
};
const toast: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--text)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};
const errorToast: CSSProperties = { borderColor: "salmon", color: "salmon" };
