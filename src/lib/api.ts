// api.ts — Cliente HTTP simples para o painel admin
// Substitui o tRPC para evitar problemas de serialização

function getToken(): string {
  return localStorage.getItem("admin_token") ?? "";
}

async function call<T>(endpoint: string, input?: unknown): Promise<T> {
  const token = getToken();
  const isQuery = !endpoint.includes("upsert") && !endpoint.includes("delete") &&
    !endpoint.includes("update") && !endpoint.includes("upload") &&
    !endpoint.includes("setup") && !endpoint.includes("login") &&
    !endpoint.includes("logout");

  let url = `/api/trpc/${endpoint}?batch=1`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let fetchOptions: RequestInit;

  if (isQuery) {
    // Queries usam GET com input na query string
    const inputStr = encodeURIComponent(JSON.stringify({ "0": { json: input ?? null } }));
    url += `&input=${inputStr}`;
    fetchOptions = { method: "GET", headers };
  } else {
    // Mutations usam POST com body
    fetchOptions = {
      method: "POST",
      headers,
      body: JSON.stringify({ "0": { json: input } }),
    };
  }

  const res = await fetch(url, { ...fetchOptions, credentials: "include" });
  const data = await res.json();

  // O servidor retorna array: [{result: {data: {json: ...}}}] ou [{error: {json: {...}}}]
  const item = Array.isArray(data) ? data[0] : data;

  if (item?.error) {
    const msg = item.error?.json?.message ?? item.error?.message ?? "Erro desconhecido";
    throw new Error(msg);
  }

  return (item?.result?.data?.json ?? item?.result?.data ?? null) as T;
}

// ── API Client completo ────────────────────────────────────────
export const api = {
  auth: {
    login: (input: { email: string; password: string }) =>
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Login falhou");
        return d as { id: number; name: string; email: string; role: string; token: string };
      }),
    me: () =>
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d?.id) return null;
        return d as { id: number; name: string; email: string; role: string };
      }).catch(() => null),
    logout: () =>
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      }).catch(() => {}),
  },

  dashboard: {
    stats: () => call<{
      totalPosts: number; published: number; drafts: number; scheduled: number;
      archived: number; totalCategories: number; totalMedia: number;
      totalLeads: number; newLeads: number; totalFaq: number;
    }>("dashboard.stats"),
    recentPosts: () => call<any[]>("dashboard.recentPosts"),
    recentLeads: () => call<any[]>("dashboard.recentLeads"),
  },

  blog: {
    list: () => call<any[]>("blog.list"),
    getById: (id: number) => call<any>("blog.getById", { id }),
    upsert: (data: any) => call<any>("blog.upsert", data),
    delete: (id: number) => call<{ ok: boolean }>("blog.delete", { id }),
  },

  categories: {
    list: () => call<any[]>("categories.list"),
    upsert: (data: any) => call<any>("categories.upsert", data),
    delete: (id: number) => call<{ ok: boolean }>("categories.delete", { id }),
  },

  faq: {
    list: () => call<any[]>("faq.list"),
    upsert: (data: any) => call<any>("faq.upsert", data),
    delete: (id: number) => call<{ ok: boolean }>("faq.delete", { id }),
  },

  leads: {
    list: () => call<any[]>("leads.list"),
    updateStatus: (id: number, status: string) => call<any>("leads.updateStatus", { id, status }),
    delete: (id: number) => call<{ ok: boolean }>("leads.delete", { id }),
  },

  media: {
    list: () => call<any[]>("media.list"),
    upload: (data: any) => call<any>("media.upload", data),
    delete: (id: number) => call<any>("media.delete", { id }),
  },

  settings: {
    list: () => call<any[]>("settings.list"),
    upsert: (key: string, value: string) => call<{ ok: boolean }>("settings.upsert", { key, value }),
    upsertMany: (items: { key: string; value: string }[]) => call<{ ok: boolean }>("settings.upsertMany", items),
  },

  upload: (file: { name: string; type: string; size: number; data: string }) =>
    fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      credentials: "include",
      body: JSON.stringify(file),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Upload falhou");
      return d;
    }),
};
