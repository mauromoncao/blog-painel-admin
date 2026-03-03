import React, { createContext, useContext, useState, useEffect } from "react";

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

// Busca o usuário atual pelo token no localStorage (fetch direto, sem tRPC)
async function fetchMe(): Promise<AuthUser | null> {
  const token = localStorage.getItem("admin_token");
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Suporte a dois formatos: {id,name,...} ou {result:{data:{json:{...}}}}
    const data = json?.result?.data?.json ?? json;
    if (data?.id) return data as AuthUser;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
    } catch {
      // ignora
    }
    localStorage.removeItem("admin_token");
    setUser(null);
    window.location.href = "/login";
  };

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
