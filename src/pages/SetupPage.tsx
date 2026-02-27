import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  const setupMutation = trpc.auth.setup.useMutation({
    onSuccess: () => {
      toast.success("Administrador criado! Faça login.");
      setLocation("/login");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Senha deve ter ao menos 8 caracteres"); return; }
    setLoading(true);
    try { await setupMutation.mutateAsync({ name, email, password }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-8 pt-10 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}>
          <h1 className="text-2xl font-bold text-white">Configuração Inicial</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>Crie o primeiro administrador</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Nome</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8B84B] focus:outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8B84B] focus:outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Senha (mín. 8 caracteres)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8B84B] focus:outline-none transition" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
            {loading ? "Criando…" : "Criar Administrador"}
          </button>
        </form>
      </div>
    </div>
  );
}
