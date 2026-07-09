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
export interface PresenceEvent {
  userId: string;
  name: string | null;
  teamId: string;
}
type PresenceHandler = (p: PresenceEvent) => void;

interface SyncCtx {
  status: "connecting" | "open" | "closed";
  subscribeWorkspace: (workspaceId: string) => void;
  onDelta: (handler: DeltaHandler) => () => void;
  sendPresence: (teamId: string) => void;
  onPresence: (handler: PresenceHandler) => () => void;
}

const Ctx = createContext<SyncCtx>({
  status: "closed",
  subscribeWorkspace: () => {},
  onDelta: () => () => {},
  sendPresence: () => {},
  onPresence: () => () => {},
});

/**
 * The sync client. One WebSocket for the app. Durable deltas and ephemeral presence share the
 * socket but live on separate logical paths (deltas patch state and persist; presence is fire-and-
 * forget). On (re)connect we re-subscribe from lastSeq — a dropped connection self-heals.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const deltaHandlers = useRef<Set<DeltaHandler>>(new Set());
  const presenceHandlers = useRef<Set<PresenceHandler>>(new Set());
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
          JSON.stringify({ type: "subscribe", workspaceId: workspaceRef.current, lastSeq: lastSeqRef.current }),
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
        for (const h of deltaHandlers.current) h(msg.delta);
      } else if (msg.type === "presence") {
        for (const h of presenceHandlers.current) h(msg);
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
    lastSeqRef.current = 0;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "subscribe", workspaceId, lastSeq: 0 }));
    }
  }, []);

  const onDelta = useCallback((handler: DeltaHandler) => {
    deltaHandlers.current.add(handler);
    return () => {
      deltaHandlers.current.delete(handler);
    };
  }, []);

  const sendPresence = useCallback((teamId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "presence", teamId }));
    }
  }, []);

  const onPresence = useCallback((handler: PresenceHandler) => {
    presenceHandlers.current.add(handler);
    return () => {
      presenceHandlers.current.delete(handler);
    };
  }, []);

  return (
    <Ctx.Provider value={{ status, subscribeWorkspace, onDelta, sendPresence, onPresence }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSync = () => useContext(Ctx);

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
