import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { formatDate, truncate } from "../lib/utils";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Eye, Star, StarOff, CheckCircle, Clock, Archive, FileText } from "lucide-react";

const GOLD  = "#E8B84B";
const NAVY  = "#19385C";

const STATUS_OPTS = [
  { value: "",          label: "Todos os status" },
  { value: "published", label: "Publicados" },
  { value: "draft",     label: "Rascunhos" },
  { value: "scheduled", label: "Agendados" },
  { value: "archived",  label: "Arquivados" },
];

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  published: { label: "Publicado", bg: "#F0FDF4", color: "#16A34A", icon: CheckCircle },
  draft:     { label: "Rascunho",  bg: "#F3F4F6", color: "#6B7280", icon: FileText },
  scheduled: { label: "Agendado",  bg: "#EFF6FF", color: "#2563EB", icon: Clock },
  archived:  { label: "Arquivado", bg: "#FEF2F2", color: "#DC2626", icon: Archive },
};

export default function BlogPosts() {
  const [, setLocation] = useLocation();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [confirmDelete, setConfirmDelete]   = useState<number | null>(null);

  const { data: posts = [], isLoading, refetch } = trpc.blog.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const deleteMutation  = trpc.blog.delete.useMutation({ onSuccess: () => { toast.success("Post excluído"); refetch(); } });
  const upsertMutation  = trpc.blog.upsert.useMutation({ onSuccess: () => { toast.success("Post atualizado"); refetch(); } });

  const filtered = posts.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const togglePublish = (post: typeof posts[number]) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    upsertMutation.mutate({
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: newStatus as "draft" | "published",
      subtitle: post.subtitle ?? undefined,
      excerpt: post.excerpt ?? undefined,
      content: post.content ?? undefined,
      coverImage: post.coverImage ?? undefined,
      coverImageAlt: post.coverImageAlt ?? undefined,
      videoUrl: post.videoUrl ?? undefined,
      authorName: post.authorName ?? undefined,
      category: post.category ?? undefined,
      tags: post.tags ?? undefined,
      metaTitle: post.metaTitle ?? undefined,
      metaDescription: post.metaDescription ?? undefined,
      metaKeywords: post.metaKeywords ?? undefined,
      ogImage: post.ogImage ?? undefined,
      ctaText: post.ctaText ?? undefined,
      ctaUrl: post.ctaUrl ?? undefined,
      isFeatured: post.isFeatured,
      publishedAt: post.publishedAt?.toString() ?? undefined,
      scheduledAt: post.scheduledAt?.toString() ?? undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Postagens</h1>
          <p className="text-sm text-gray-500 mt-0.5">{posts.length} {posts.length === 1 ? "postagem" : "postagens"} no total</p>
        </div>
        <button onClick={() => setLocation("/blog/new")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg hover:opacity-90 transition"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
          <Plus size={18} /> Nova Postagem
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou slug…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm bg-white">
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm bg-white">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: GOLD }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhuma postagem encontrada</p>
            <button onClick={() => setLocation("/blog/new")}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: GOLD }}>
              Criar primeira postagem
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="px-6 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Data</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center hidden md:table-cell">Destaque</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(post => {
                  const s = STATUS_STYLE[post.status] ?? STATUS_STYLE.draft;
                  const StatusIcon = s.icon;
                  return (
                    <tr key={post.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{truncate(post.title, 60)}</div>
                        {post.subtitle && <div className="text-xs text-gray-400 mt-0.5">{truncate(post.subtitle, 60)}</div>}
                        <div className="text-xs text-gray-400 font-mono mt-0.5">/{post.slug}</div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{post.category ?? "—"}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 hidden lg:table-cell">{formatDate(post.createdAt)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                          <StatusIcon size={11} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        {post.isFeatured ? <Star size={16} fill={GOLD} color={GOLD} /> : <StarOff size={16} className="text-gray-300" />}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ActionBtn title="Publicar/Despublicar" onClick={() => togglePublish(post)}
                            icon={post.status === "published" ? "🔴" : "🟢"} />
                          <ActionBtn title="Editar" onClick={() => setLocation(`/blog/${post.id}/edit`)}
                            icon={<Pencil size={14} />} />
                          <ActionBtn title="Excluir" onClick={() => setConfirmDelete(post.id)}
                            icon={<Trash2 size={14} />} danger />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg">Excluir postagem?</h3>
            <p className="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => { deleteMutation.mutate({ id: confirmDelete }); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ title, onClick, icon, danger }: { title: string; onClick: () => void; icon: any; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border transition text-sm
        ${danger ? "border-red-200 text-red-500 hover:bg-red-50" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
      {icon}
    </button>
  );
}
