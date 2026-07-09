import { useCallback, useEffect, useRef, useState } from "react";
import { EchoMessageSchema, type EchoMessage } from "@tracer/shared";

type Status = "connecting" | "open" | "closed";

/**
 * A small WebSocket hook for the walking skeleton: connects, exposes status, sends echo
 * messages, and reconnects with capped exponential backoff + jitter. Sprint 06 replaces
 * this with the real sync client — but the connection-state model starts here.
 */
export function useEcho(url: string) {
  const [status, setStatus] = useState<Status>("connecting");
  const [lastEcho, setLastEcho] = useState<EchoMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setStatus("open");
      };
      ws.onmessage = (ev) => {
        const raw = typeof ev.data === "string" ? ev.data : "";
        const parsed = EchoMessageSchema.safeParse(safeJson(raw));
        if (parsed.success) setLastEcho(parsed.data);
      };
      ws.onclose = () => {
        setStatus("closed");
        if (closedByUnmount) return;
        const delay = Math.min(1000 * 2 ** attemptsRef.current, 10_000) + Math.random() * 250;
        attemptsRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      closedByUnmount = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [url]);

  const sendEcho = useCallback((payload: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg: EchoMessage = { type: "echo", payload, ts: Date.now() };
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { status, lastEcho, sendEcho };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
