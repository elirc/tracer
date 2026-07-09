import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

interface SessionCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => void;
}

const Ctx = createContext<SessionCtx>({ user: null, loading: true, refresh: () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    apiGet<SessionUser | null>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => refresh(), [refresh]);

  return <Ctx.Provider value={{ user, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
