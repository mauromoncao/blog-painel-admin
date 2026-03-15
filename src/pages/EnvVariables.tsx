import { useState } from "react";
import {
  Terminal, CheckCircle2, XCircle, AlertCircle, Copy, Check,
  Database, Lock, Globe, Key, Server, Zap, ChevronDown, ChevronUp,
  ExternalLink, Info
} from "lucide-react";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

// ── Definição de todas as variáveis ─────────────────────────────
const ENV_GROUPS = [
  {
    id: "database",
    label: "Banco de Dados",
    icon: Database,
    color: "#3B82F6",
    bg: "#EFF6FF",
    vars: [
      {
        key: "DATABASE_URL",
        required: true,
        description: "String de conexão com o banco PostgreSQL (Neon, Supabase, Railway, etc.)",
        example: "postgresql://usuario:senha@host.neon.tech/nomedobanco?sslmode=require",
        tip: "Obtenha no painel do Neon em: neon.tech → seu projeto → Connection string",
        link: "https://neon.tech",
        linkLabel: "Abrir Neon",
      },
    ],
  },
  {
    id: "auth",
    label: "Autenticação & Segurança",
    icon: Lock,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    vars: [
      {
        key: "JWT_SECRET",
        required: true,
        description: "Chave secreta para assinar tokens JWT de sessão. Use uma string longa e aleatória.",
        example: "d8f3a1c7e2b0f9d4a6c8e1b3f7d2a5c9e0b1f4d7a3c6e9b2",
        tip: 'Gere com o comando: openssl rand -hex 32',
        link: null,
        linkLabel: null,
      },
      {
        key: "ADMIN_PASSWORD_HASH",
        required: false,
        description: "Hash bcrypt da senha dos usuários admin fixos (fallback quando o banco falha).",
        example: "$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        tip: 'Gere em: bcrypt-generator.com com 12 rounds',
        link: "https://bcrypt-generator.com",
        linkLabel: "Gerar Hash",
      },
    ],
  },
  {
    id: "server",
    label: "Servidor & Ambiente",
    icon: Server,
    color: "#10B981",
    bg: "#ECFDF5",
    vars: [
      {
        key: "NODE_ENV",
        required: false,
        description: "Ambiente de execução. Em produção (Cloudflare Pages) deve ser 'production'.",
        example: "production",
        tip: "Cloudflare Pages define automaticamente — não precisa configurar.",
        link: null,
        linkLabel: null,
      },
      {
        key: "CORS_ORIGIN",
        required: false,
        description: "URL base do frontend permitida pelo CORS. Útil ao usar domínio customizado.",
        example: "https://admin.mauromoncao.adv.br",
        tip: "Se estiver usando o domínio padrão do Cloudflare Pages, não é obrigatória.",
        link: null,
        linkLabel: null,
      },
      {
        key: "PORT",
        required: false,
        description: "Porta do servidor Express (somente em ambiente local, dev).",
        example: "3001",
        tip: "Não é necessária no Cloudflare Pages — use apenas para desenvolvimento local.",
        link: null,
        linkLabel: null,
      },
    ],
  },
  {
    id: "oauth",
    label: "OAuth Google (Opcional)",
    icon: Key,
    color: "#F59E0B",
    bg: "#FFFBEB",
    vars: [
      {
        key: "GOOGLE_CLIENT_ID",
        required: false,
        description: "Client ID do projeto OAuth no Google Cloud Console (para login com Google).",
        example: "123456789012-abcdefghijklmnop.apps.googleusercontent.com",
        tip: "Crie em: console.cloud.google.com → APIs → Credenciais → OAuth 2.0",
        link: "https://console.cloud.google.com",
        linkLabel: "Google Cloud",
      },
      {
        key: "GOOGLE_CLIENT_SECRET",
        required: false,
        description: "Client Secret do projeto OAuth no Google Cloud Console.",
        example: "GOCSPX-XXXXXXXXXXXXXXXXXXXXXX",
        tip: "Encontrado na mesma tela do Client ID no Google Cloud.",
        link: "https://console.cloud.google.com",
        linkLabel: "Google Cloud",
      },
      {
        key: "GOOGLE_REDIRECT_URI",
        required: false,
        description: "URI de redirecionamento após login com Google (deve estar no Google Cloud).",
        example: "https://blog-painel.mauromoncao.adv.br/api/auth/google/callback",
        tip: "Adicione exatamente esta URL nas URIs autorizadas no Google Cloud.",
        link: null,
        linkLabel: null,
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrações Externas (Futuro)",
    icon: Zap,
    color: "#EF4444",
    bg: "#FEF2F2",
    vars: [
      {
        key: "CLOUDINARY_URL",
        required: false,
        description: "URL de conexão do Cloudinary para upload de imagens/mídia.",
        example: "cloudinary://api_key:api_secret@cloud_name",
        tip: "Obtenha em: cloudinary.com → Dashboard → API Environment variable",
        link: "https://cloudinary.com",
        linkLabel: "Cloudinary",
      },
      {
        key: "SMTP_HOST",
        required: false,
        description: "Host do servidor de e-mail para envio de notificações.",
        example: "smtp.gmail.com",
        tip: "Use SMTP do Gmail, Resend, SendGrid ou similar.",
        link: null,
        linkLabel: null,
      },
      {
        key: "SMTP_USER",
        required: false,
        description: "E-mail/usuário do servidor SMTP.",
        example: "contato@mauromoncao.adv.br",
        tip: null,
        link: null,
        linkLabel: null,
      },
      {
        key: "SMTP_PASS",
        required: false,
        description: "Senha ou App Password do servidor SMTP.",
        example: "xxxx xxxx xxxx xxxx",
        tip: "No Gmail, gere em: Conta Google → Segurança → Senhas de app",
        link: null,
        linkLabel: null,
      },
    ],
  },
];

// ── Status de verificação das variáveis ─────────────────────────
// (O frontend não tem acesso direto às env do Cloudflare Pages — simula via API)
async function checkEnvStatus(): Promise<Record<string, "ok" | "missing" | "unknown">> {
  try {
    const token = localStorage.getItem("admin_token");
    const res = await fetch("/api/trpc/dashboard.stats?batch=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const hasDb = json?.[0]?.result?.data?.json?.totalPosts !== undefined;
    return {
      DATABASE_URL: hasDb ? "ok" : "missing",
      JWT_SECRET: token ? "ok" : "unknown",
    };
  } catch {
    return { DATABASE_URL: "missing" };
  }
}

// ── Componente Principal ─────────────────────────────────────────
export default function EnvVariables() {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>("database");
  const [status, setStatus] = useState<Record<string, "ok" | "missing" | "unknown">>({});
  const [checking, setChecking] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const runCheck = async () => {
    setChecking(true);
    const result = await checkEnvStatus();
    setStatus(result);
    setChecking(false);
  };

  const toggleGroup = (id: string) => setExpanded(prev => prev === id ? null : id);

  const totalRequired = ENV_GROUPS.flatMap(g => g.vars).filter(v => v.required).length;
  const totalOptional = ENV_GROUPS.flatMap(g => g.vars).filter(v => !v.required).length;
  const totalVars = ENV_GROUPS.flatMap(g => g.vars).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Terminal size={22} style={{ color: NAVY }} />
            Environment Variables
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Variáveis de ambiente que devem ser configuradas no Cloudflare Pages Dashboard
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow-sm disabled:opacity-50 transition"
          style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4a8a)` }}
        >
          {checking ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Zap size={15} />
          )}
          {checking ? "Verificando…" : "Verificar Conexões"}
        </button>
      </div>

      {/* ── Resumo ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: NAVY }}>{totalVars}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Total de variáveis</div>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-red-500">{totalRequired}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Obrigatórias</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-gray-400">{totalOptional}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Opcionais</div>
        </div>
      </div>

      {/* ── Banner informativo ── */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border"
        style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
        <Info size={18} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
        <div className="text-sm text-amber-800">
          <strong>Como configurar:</strong> Acesse{" "}
          <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer"
            className="underline font-semibold">dash.cloudflare.com</a>
          {" "}→ Selecione o projeto <strong>blog-painel-admin</strong> →{" "}
          <strong>Settings</strong> → <strong>Environment Variables</strong> → adicione cada
          variável com o valor correspondente → clique em <strong>Save</strong> → faça um novo
          deploy (Deployments → Redeploy).
        </div>
      </div>

      {/* ── Grupos de variáveis ── */}
      {ENV_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = expanded === group.id;
        const requiredInGroup = group.vars.filter(v => v.required).length;

        return (
          <div key={group.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition text-left"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: group.bg }}>
                <GroupIcon size={18} style={{ color: group.color }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">{group.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {group.vars.length} variável{group.vars.length !== 1 ? "is" : ""}
                  {requiredInGroup > 0 && (
                    <span className="ml-2 text-red-500 font-medium">
                      · {requiredInGroup} obrigatória{requiredInGroup !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {/* Variables Table */}
            {isOpen && (
              <div className="border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Variável</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição & Exemplo</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.vars.map((v) => {
                      const varStatus = status[v.key];
                      return (
                        <tr key={v.key} className="hover:bg-gray-50/50 transition">
                          {/* Key */}
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-start gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="font-mono text-xs font-bold px-2 py-1 rounded-lg"
                                    style={{ background: group.bg, color: group.color }}>
                                    {v.key}
                                  </code>
                                  {v.required ? (
                                    <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                      obrigatória
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                      opcional
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Description + Example */}
                          <td className="px-4 py-4 align-top">
                            <p className="text-gray-600 text-xs leading-relaxed mb-2">{v.description}</p>

                            {/* Example */}
                            <div className="flex items-center gap-2 group/copy">
                              <code className="flex-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-mono truncate max-w-xs">
                                {v.example}
                              </code>
                              <button
                                onClick={() => copyToClipboard(v.example, v.key)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-400 hover:text-gray-700 flex-shrink-0"
                                title="Copiar exemplo"
                              >
                                {copied === v.key ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                              </button>
                            </div>

                            {/* Tip */}
                            {v.tip && (
                              <div className="mt-2 flex items-start gap-1.5">
                                <Info size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <span className="text-xs text-gray-400">{v.tip}</span>
                                {v.link && (
                                  <a href={v.link} target="_blank" rel="noreferrer"
                                    className="ml-1 text-xs font-semibold flex items-center gap-0.5 hover:underline flex-shrink-0"
                                    style={{ color: GOLD }}>
                                    {v.linkLabel} <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 text-center align-top">
                            {varStatus === "ok" ? (
                              <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                <CheckCircle2 size={16} />
                                <span className="text-xs font-semibold">Ativa</span>
                              </div>
                            ) : varStatus === "missing" ? (
                              <div className="flex items-center justify-center gap-1.5 text-red-500">
                                <XCircle size={16} />
                                <span className="text-xs font-semibold">Ausente</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 text-gray-400">
                                <AlertCircle size={16} />
                                <span className="text-xs">—</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Guia rápido de deploy ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3"
          style={{ background: "#F0F4FF" }}>
          <Globe size={18} style={{ color: NAVY }} />
          <span className="font-semibold text-gray-800 text-sm">Passo a passo — Cloudflare Pages</span>
        </div>
        <div className="p-6">
          <ol className="space-y-3">
            {[
              { step: "1", text: 'Acesse dash.cloudflare.com e entre na sua conta', bold: "dash.cloudflare.com" },
              { step: "2", text: 'Clique no projeto "blog-painel-admin"' },
              { step: "3", text: 'Vá em Settings → Environment Variables' },
              { step: "4", text: 'Clique em "Add New" e preencha o Name e o Value de cada variável obrigatória acima' },
              { step: "5", text: 'Marque os ambientes: Production, Preview e Development' },
              { step: "6", text: 'Clique em Save' },
              { step: "7", text: 'Vá em Deployments → clique nos 3 pontos do último deploy → Redeploy' },
              { step: "8", text: 'Aguarde ~40 segundos e acesse o painel novamente — as abas vão funcionar!' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: NAVY }}>
                  {item.step}
                </span>
                <span className="text-sm text-gray-600 pt-0.5">{item.text}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5">
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm shadow-sm transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4a8a)` }}
            >
              Abrir Cloudflare Dashboard <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
