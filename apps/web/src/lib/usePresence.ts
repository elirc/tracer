import { useEffect, useState } from "react";
import { useSync } from "./sync";

/**
 * Who else is viewing this team. Presence is EPHEMERAL: we heartbeat it, expire stale viewers, and
 * never persist it. Contrast comments/issues, which are durable and ride the mutation log. Routing
 * ephemeral and durable state on different paths is the S09 lesson (ADR-0008).
 */
export function usePresence(teamId: string): string[] {
  const { sendPresence, onPresence } = useSync();
  const [viewers, setViewers] = useState<Record<string, { name: string | null; ts: number }>>({});

  // Heartbeat our presence every few seconds while viewing this team.
  useEffect(() => {
    sendPresence(teamId);
    const iv = window.setInterval(() => sendPresence(teamId), 5000);
    return () => window.clearInterval(iv);
  }, [teamId, sendPresence]);

  // Collect others' presence.
  useEffect(
    () =>
      onPresence((p) => {
        if (p.teamId !== teamId) return;
        setViewers((v) => ({ ...v, [p.userId]: { name: p.name, ts: Date.now() } }));
      }),
    [onPresence, teamId],
  );

  // Expire viewers we haven't heard from recently (a dead connection just goes quiet).
  useEffect(() => {
    const iv = window.setInterval(() => {
      setViewers((v) => {
        const now = Date.now();
        return Object.fromEntries(Object.entries(v).filter(([, x]) => now - x.ts < 12_000));
      });
    }, 4000);
    return () => window.clearInterval(iv);
  }, []);

  return Object.values(viewers).map((x) => x.name ?? "someone");
}
