import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

// ── Emails autorizados (whitelist) ─────────────────────────
const ALLOWED_EMAILS = [
  "mauromoncaoestudos@gmail.com",
  "mauromoncaoadv.escritorio@gmail.com",
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const utils = trpc.useUtils();

  // ── Mostrar erros de OAuth vindos da URL ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const errorMessages: Record<string, string> = {
      email_not_authorized: "⛔ E-mail não autorizado. Somente administradores cadastrados.",
      google_denied:        "Login com Google cancelado.",
      google_not_configured:"Google OAuth não configurado no servidor.",
      account_inactive:     "Conta inativa. Contate o administrador.",
      google_token_failed:  "Falha na autenticação Google. Tente novamente.",
      google_internal_error:"Erro interno. Tente novamente.",
    };
    if (err && errorMessages[err]) {
      toast.error(errorMessages[err]);
      // Limpar da URL
      window.history.replaceState({}, "", "/login");
    }
  }, []);

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

    // Validar whitelist antes de tentar login
    if (!ALLOWED_EMAILS.includes(email.toLowerCase().trim())) {
      toast.error("Acesso não autorizado para este e-mail.");
      return;
    }

    setLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ──────────────────────────────────────────
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Redireciona para endpoint Google OAuth no servidor
    window.location.href = "/api/auth/google";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}
    >
      <div className="w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div
            className="px-8 pt-10 pb-6 text-center"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: GOLD }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
              Mauro Monção Advogados Associados
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-8 space-y-5">

            {/* ── Botão Google OAuth ─────────────────────── */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-gray-700 shadow-sm disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? "Redirecionando…" : "Entrar com Google"}
            </button>

            {/* ── Divisor ─────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou com e-mail e senha</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Formulário e-mail/senha ──────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 space-y-2">
            <p className="text-center text-xs text-gray-400">
              🔒 Acesso restrito — apenas administradores autorizados
            </p>
            <p className="text-center text-xs text-gray-300">
              Login Google disponível somente para e-mails cadastrados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
