import { useState } from "react";
import { trpc } from "../lib/trpc";
import { slugify } from "../lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, X, Check, Upload } from "lucide-react";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

const LEGAL_CATEGORIES = [
  { name: "Direito Tributário",           slug: "tributario" },
  { name: "Defesa Fiscal",                slug: "defesa-fiscal" },
  { name: "Planejamento Patrimonial",     slug: "planejamento-patrimonial" },
  { name: "Direito Sucessório",           slug: "sucessorio" },
  { name: "Direito Imobiliário",          slug: "imobiliario" },
  { name: "Advocacia Pública",            slug: "advocacia-publica" },
  { name: "Direito Previdenciário",       slug: "previdenciario" },
  { name: "Direito Bancário",             slug: "bancario" },
  { name: "Direito do Trabalho",          slug: "trabalhista" },
  { name: "Direito do Consumidor",        slug: "consumidor" },
  { name: "Direito de Família",           slug: "familia" },
  { name: "Direito Empresarial",          slug: "empresarial" },
  { name: "Atualidades Jurídicas",        slug: "atualidades" },
];

interface CatForm { id?: number; name: string; slug: string; description: string; sortOrder: number }
const EMPTY_CAT: CatForm = { name: "", slug: "", description: "", sortOrder: 0 };

export default function Categories() {
  const [editing, setEditing] = useState<CatForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: cats = [], isLoading, refetch } = trpc.categories.list.useQuery();
  const upsert = trpc.categories.upsert.useMutation({ onSuccess: () => { toast.success("Categoria salva!"); setEditing(null); refetch(); }, onError: e => toast.error(e.message) });
  const del    = trpc.categories.delete.useMutation({ onSuccess: () => { toast.success("Excluída!"); refetch(); }, onError: e => toast.error(e.message) });

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!editing.slug.trim()) { toast.error("Slug é obrigatório"); return; }
    upsert.mutate({ id: editing.id, name: editing.name, slug: editing.slug, description: editing.description, sortOrder: editing.sortOrder });
  };

  const importDefaults = async () => {
    const existing = new Set(cats.map(c => c.slug));
    const toImport = LEGAL_CATEGORIES.filter(c => !existing.has(c.slug));
    for (const cat of toImport) await upsert.mutateAsync({ name: cat.name, slug: cat.slug });
    toast.success(`${toImport.length} categorias importadas`);
    refetch();
  };

  const set = (k: keyof CatForm, v: any) => setEditing(f => f ? { ...f, [k]: v } : f);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cats.length} {cats.length === 1 ? "categoria" : "categorias"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={importDefaults}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Upload size={15} /> Importar Padrões
          </button>
          <button onClick={() => setEditing(EMPTY_CAT)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
            <Plus size={18} /> Nova Categoria
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: GOLD }} /></div>
        ) : cats.length === 0 ? (
          <div className="text-center py-16">
            <Tag size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">Nenhuma categoria ainda</p>
            <button onClick={importDefaults} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: GOLD }}>
              Importar 13 categorias jurídicas
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                <th className="px-6 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Slug</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Descrição</th>
                <th className="px-4 py-3 text-center">Ordem</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cats.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${GOLD}22` }}>
                        <Tag size={12} color={GOLD} />
                      </span>
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.slug}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-gray-400 text-xs">{c.description ?? "—"}</td>
                  <td className="px-4 py-3.5 text-center text-gray-500">{c.sortOrder}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", sortOrder: c.sortOrder })}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(c.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing.id ? "Editar Categoria" : "Nova Categoria"}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input value={editing.name}
                  onChange={e => { set("name", e.target.value); if (!editing.id) set("slug", slugify(e.target.value)); }}
                  className="input" placeholder="Ex: Direito Tributário" autoFocus />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input value={editing.slug}
                  onChange={e => set("slug", slugify(e.target.value))}
                  className="input font-mono" placeholder="tributario" />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea value={editing.description} onChange={e => set("description", e.target.value)}
                  rows={2} className="input resize-none" placeholder="Breve descrição da categoria" />
              </div>
              <div>
                <label className="label">Ordem de exibição</label>
                <input type="number" value={editing.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)}
                  className="input" min={0} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={save} disabled={upsert.isPending}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
                {upsert.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg">Excluir categoria?</h3>
            <p className="text-sm text-gray-600 mt-2">Os posts vinculados não serão excluídos, mas perderão o vínculo de categoria.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Cancelar</button>
              <button onClick={() => { del.mutate({ id: confirmDelete }); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
