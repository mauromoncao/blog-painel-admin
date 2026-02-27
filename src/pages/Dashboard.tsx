import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { formatDate } from "../lib/utils";
import {
  FileText, CheckCircle, Clock, Archive, Tag, Image, Users, HelpCircle,
  Plus, Settings, TrendingUp, BookOpen
} from "lucide-react";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  new:        { label: "Novo",        bg: "#EFF6FF", color: "#1D4ED8" },
  contacted:  { label: "Contactado",  bg: "#F0FDF4", color: "#16A34A" },
  converted:  { label: "Convertido",  bg: "#F0FDF4", color: "#15803D" },
  archived:   { label: "Arquivado",   bg: "#F3F4F6", color: "#6B7280" },
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color ? `${color}18` : "#E8B84B18" }}>
        <Icon size={22} color={color ?? GOLD} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, color }: { icon: any; label: string; href: string; color?: string }) {
  const [, setLocation] = useLocation();
  return (
    <button onClick={() => setLocation(href)}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed hover:border-solid transition-all hover:shadow-md group"
      style={{ borderColor: color ?? GOLD }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ background: `${color ?? GOLD}18` }}>
        <Icon size={20} color={color ?? GOLD} />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentLeads } = trpc.dashboard.recentLeads.useQuery();
  const { data: recentPosts } = trpc.dashboard.recentPosts.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: GOLD }} />
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f2240 100%)` }}>
        <h2 className="text-2xl font-bold">Bem‑vindo ao Painel 👋</h2>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Gerencie todo o conteúdo do blog jurídico em um só lugar.
        </p>
      </div>

      {/* Stats Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Postagens</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={BookOpen}     label="Total de Posts"   value={stats?.totalPosts ?? 0} />
          <StatCard icon={CheckCircle}  label="Publicados"       value={stats?.published ?? 0}   color="#16A34A" />
          <StatCard icon={FileText}     label="Rascunhos"        value={stats?.drafts ?? 0}      color="#9CA3AF" />
          <StatCard icon={Clock}        label="Agendados"        value={stats?.scheduled ?? 0}   color="#2563EB" />
          <StatCard icon={Archive}      label="Arquivados"       value={stats?.archived ?? 0}    color="#6B7280" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Geral</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Tag}          label="Categorias"       value={stats?.totalCategories ?? 0} color={NAVY} />
          <StatCard icon={Image}        label="Arquivos de Mídia"value={stats?.totalMedia ?? 0}      color="#7C3AED" />
          <StatCard icon={Users}        label="Leads"            value={stats?.totalLeads ?? 0}      color="#DC2626" />
          <StatCard icon={HelpCircle}   label="FAQs"             value={stats?.totalFaq ?? 0}        color="#0891B2" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction icon={Plus}       label="Nova Postagem"  href="/blog/new" />
          <QuickAction icon={Tag}        label="Categorias"     href="/categories" color={NAVY} />
          <QuickAction icon={Image}      label="Upload Mídia"   href="/media" color="#7C3AED" />
          <QuickAction icon={Settings}   label="Configurações"  href="/settings" color="#6B7280" />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Postagens Recentes</h3>
            <a href="/blog" className="text-xs font-medium hover:underline" style={{ color: GOLD }}>Ver todas</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPosts?.length ? recentPosts.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E8B84B18" }}>
                  <FileText size={14} color={GOLD} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{p.title}</div>
                  <div className="text-xs text-gray-400">{formatDate(p.createdAt)}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-sm text-gray-400">Nenhuma postagem ainda</div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Últimos Leads</h3>
            <a href="/leads" className="text-xs font-medium hover:underline" style={{ color: GOLD }}>Ver todos</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLeads?.length ? recentLeads.map(l => (
              <div key={l.id} className="flex items-center gap-4 px-6 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: NAVY }}>{l.name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{l.name}</div>
                  <div className="text-xs text-gray-400">{l.email ?? l.phone ?? "—"}</div>
                </div>
                <LeadBadge status={l.status} />
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-sm text-gray-400">Nenhum lead ainda</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { label: string; color: string }> = {
    draft:     { label: "Rascunho",  color: "#9CA3AF" },
    published: { label: "Publicado", color: "#16A34A" },
    scheduled: { label: "Agendado",  color: "#2563EB" },
    archived:  { label: "Arquivado", color: "#6B7280" },
  };
  const { label, color } = MAP[status] ?? MAP.draft;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{label}</span>;
}

function LeadBadge({ status }: { status: string }) {
  const { label, bg, color } = STATUS_BADGE[status] ?? STATUS_BADGE.new;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{label}</span>;
}
