import { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, HelpCircle } from "lucide-react";

const GOLD = "#E8B84B";

interface FaqForm { id?: number; question: string; answer: string; category: string; isPublished: boolean; sortOrder: number }
const EMPTY: FaqForm = { question: "", answer: "", category: "", isPublished: true, sortOrder: 0 };

export default function FaqAdmin() {
  const [editing, setEditing] = useState<FaqForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: faqs = [], isLoading, refetch } = trpc.faq.list.useQuery();
  const upsert = trpc.faq.upsert.useMutation({ onSuccess: () => { toast.success("FAQ salvo!"); setEditing(null); refetch(); }, onError: e => toast.error(e.message) });
  const del    = trpc.faq.delete.useMutation({ onSuccess: () => { toast.success("Excluído!"); refetch(); setConfirmDelete(null); }, onError: e => toast.error(e.message) });

  const save = () => {
    if (!editing) return;
    if (!editing.question.trim()) { toast.error("Pergunta é obrigatória"); return; }
    if (!editing.answer.trim())   { toast.error("Resposta é obrigatória"); return; }
    upsert.mutate(editing);
  };
  const set = (k: keyof FaqForm, v: any) => setEditing(f => f ? { ...f, [k]: v } : f);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perguntas Frequentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{faqs.length} {faqs.length === 1 ? "pergunta" : "perguntas"}</p>
        </div>
        <button onClick={() => setEditing(EMPTY)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
          <Plus size={18} /> Nova Pergunta
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: GOLD }} /></div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <HelpCircle size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhuma pergunta ainda</p>
          </div>
        ) : faqs.map(f => (
          <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm">{f.question}</div>
              <div className="text-sm text-gray-500 mt-1 line-clamp-2">{f.answer}</div>
              {f.category && <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f.category}</span>}
            </div>
            <div className="flex items-start gap-2 flex-shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                {f.isPublished ? "Publicado" : "Oculto"}
              </span>
              <button onClick={() => setEditing({ id: f.id, question: f.question, answer: f.answer, category: f.category ?? "", isPublished: f.isPublished, sortOrder: f.sortOrder })}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                <Pencil size={13} />
              </button>
              <button onClick={() => setConfirmDelete(f.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing.id ? "Editar FAQ" : "Nova Pergunta"}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Pergunta *</label>
                <input value={editing.question} onChange={e => set("question", e.target.value)} className="input" autoFocus />
              </div>
              <div>
                <label className="label">Resposta *</label>
                <textarea value={editing.answer} onChange={e => set("answer", e.target.value)} rows={4} className="input resize-none" />
              </div>
              <div>
                <label className="label">Categoria (opcional)</label>
                <input value={editing.category} onChange={e => set("category", e.target.value)} className="input" placeholder="Ex: Tributário" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="pub" checked={editing.isPublished} onChange={e => set("isPublished", e.target.checked)} className="w-4 h-4 accent-[#E8B84B]" />
                <label htmlFor="pub" className="text-sm font-medium text-gray-700 cursor-pointer">Publicar no site</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Cancelar</button>
              <button onClick={save} disabled={upsert.isPending}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
                {upsert.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900">Excluir pergunta?</h3>
            <p className="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Cancelar</button>
              <button onClick={() => del.mutate({ id: confirmDelete })} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
