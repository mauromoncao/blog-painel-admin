import { useState } from "react";
import { trpc } from "../lib/trpc";
import { formatDate } from "../lib/utils";
import { toast } from "sonner";
import { Users, Trash2, Mail, Phone, MessageSquare } from "lucide-react";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  new:       { label: "Novo",        bg: "#EFF6FF", color: "#1D4ED8" },
  contacted: { label: "Contactado",  bg: "#FFF7ED", color: "#C2410C" },
  converted: { label: "Convertido",  bg: "#F0FDF4", color: "#16A34A" },
  archived:  { label: "Arquivado",   bg: "#F3F4F6", color: "#6B7280" },
};

export default function LeadsAdmin() {
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail]         = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: leads = [], isLoading, refetch } = trpc.leads.list.useQuery();
  const updateStatus = trpc.leads.updateStatus.useMutation({ onSuccess: () => { toast.success("Status atualizado"); refetch(); }, onError: e => toast.error(e.message) });
  const del          = trpc.leads.delete.useMutation({ onSuccess: () => { toast.success("Lead excluído"); refetch(); setConfirmDelete(null); }, onError: e => toast.error(e.message) });

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search);
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selected = detail !== null ? leads.find(l => l.id === detail) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} {leads.length === 1 ? "lead" : "leads"} no total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: GOLD }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="px-6 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Contato</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Origem</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Data</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => {
                  const s = STATUS_MAP[l.status] ?? STATUS_MAP.new;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: NAVY }}>{l.name[0]?.toUpperCase()}</div>
                          <div>
                            <div className="font-medium text-gray-800">{l.name}</div>
                            {l.source && <div className="text-xs text-gray-400">{l.source}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="space-y-0.5">
                          {l.email && <div className="text-xs flex items-center gap-1 text-gray-500"><Mail size={10} />{l.email}</div>}
                          {l.phone && <div className="text-xs flex items-center gap-1 text-gray-500"><Phone size={10} />{l.phone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-gray-400 text-xs">{l.source ?? "—"}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-gray-400 text-xs">{formatDate(l.createdAt)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <select value={l.status}
                          onChange={e => updateStatus.mutate({ id: l.id, status: e.target.value as any })}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E8B84B]"
                          style={{ background: s.bg, color: s.color }}>
                          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {l.message && (
                            <button onClick={() => setDetail(l.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                              <MessageSquare size={13} />
                            </button>
                          )}
                          <button onClick={() => setConfirmDelete(l.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
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

      {/* Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Detalhes do Lead</h3>
            <div className="space-y-3 text-sm">
              <Row label="Nome" value={selected.name} />
              <Row label="E-mail" value={selected.email ?? "—"} />
              <Row label="Telefone" value={selected.phone ?? "—"} />
              <Row label="Origem" value={selected.source ?? "—"} />
              <Row label="Data" value={formatDate(selected.createdAt)} />
              {selected.message && (
                <div>
                  <span className="font-medium text-gray-500">Mensagem:</span>
                  <p className="mt-1 p-3 bg-gray-50 rounded-xl text-gray-700">{selected.message}</p>
                </div>
              )}
            </div>
            <button onClick={() => setDetail(null)} className="mt-6 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Fechar</button>
          </div>
        </div>
      )}

      {/* Delete */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900">Excluir lead?</h3>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-500 w-24 flex-shrink-0">{label}:</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
