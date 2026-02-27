import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "../lib/trpc";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    if (meQuery.isLoading) return;
    setUser(meQuery.data ?? null);
    setLoading(false);
  }, [meQuery.data, meQuery.isLoading]);

  const logout = async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
    window.location.href = "/login";
  };

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
