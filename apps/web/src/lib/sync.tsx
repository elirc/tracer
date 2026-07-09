import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ServerMessageSchema, type MutationDelta } from "@tracer/shared";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws";

type DeltaHandler = (delta: MutationDelta) => void;

interface SyncCtx {
  status: "connecting" | "open" | "closed";
  subscribeWorkspace: (workspaceId: string) => void;
  onDelta: (handler: DeltaHandler) => () => void;
}

const Ctx = createContext<SyncCtx>({
  status: "closed",
  subscribeWorkspace: () => {},
  onDelta: () => () => {},
});

/**
 * The sync client (S06). One WebSocket for the whole app; views register delta handlers. On
 * (re)connect we re-subscribe from `lastSeq`, so a dropped connection self-heals by replaying the
 * mutations it missed — the client half of "the log is truth, the socket is a hint".
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const handlers = useRef<Set<DeltaHandler>>(new Set());
  const workspaceRef = useRef<string | null>(null);
  const lastSeqRef = useRef(0);
  const attemptsRef = useRef(0);

  const connect = useCallback(() => {
    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      attemptsRef.current = 0;
      setStatus("open");
      if (workspaceRef.current) {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            workspaceId: workspaceRef.current,
            lastSeq: lastSeqRef.current,
          }),
        );
      }
    };
    ws.onmessage = (ev) => {
      const parsed = ServerMessageSchema.safeParse(
        safeJson(typeof ev.data === "string" ? ev.data : ""),
      );
      if (!parsed.success) return;
      const msg = parsed.data;
      if (msg.type === "delta") {
        lastSeqRef.current = Math.max(lastSeqRef.current, msg.delta.seq);
        for (const h of handlers.current) h(msg.delta);
      }
    };
    ws.onclose = () => {
      setStatus("closed");
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 10_000) + Math.random() * 250;
      attemptsRef.current += 1;
      window.setTimeout(connect, delay);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const subscribeWorkspace = useCallback((workspaceId: string) => {
    if (workspaceRef.current === workspaceId) return;
    workspaceRef.current = workspaceId;
    lastSeqRef.current = 0; // new workspace: bootstrap from scratch (deltas apply idempotently)
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "subscribe", workspaceId, lastSeq: 0 }));
    }
  }, []);

  const onDelta = useCallback((handler: DeltaHandler) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  return <Ctx.Provider value={{ status, subscribeWorkspace, onDelta }}>{children}</Ctx.Provider>;
}

export const useSync = () => useContext(Ctx);

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
