import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: (e) => {
      toast.error(e.message ?? "Credenciais inválidas");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}>
      <div className="w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>Mauro Monção Advogados Associados</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-gray-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8B84B] focus:outline-none transition text-gray-800"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8B84B] focus:outline-none transition text-gray-800"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-lg hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: loading ? "#ccc" : `linear-gradient(135deg, ${GOLD}, #d4a039)` }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 pb-6">
            Acesso restrito a administradores autorizados
          </p>
        </div>
      </div>
    </div>
  );
}
