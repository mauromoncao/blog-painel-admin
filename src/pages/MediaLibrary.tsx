import { useState, useRef } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Upload, Search, Copy, Trash2, X, Image as ImageIcon } from "lucide-react";

const GOLD = "#E8B84B";

export default function MediaLibrary() {
  const [search, setSearch]   = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: files = [], isLoading, refetch } = trpc.media.list.useQuery();
  const uploadMutation = trpc.media.upload.useMutation({
    onSuccess: () => { toast.success("Imagem enviada!"); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.media.delete.useMutation({
    onSuccess: () => { toast.success("Imagem excluída"); refetch(); setConfirmDelete(null); },
    onError: e => toast.error(e.message),
  });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} não é uma imagem`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} excede 10MB`); continue; }

      const data = new FormData();
      data.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: data, credentials: "include" });
        if (!res.ok) throw new Error("Upload falhou");
        const json = await res.json();
        await uploadMutation.mutateAsync(json);
      } catch (e: any) {
        toast.error(e.message ?? "Erro no upload");
      }
    }
  };

  const filtered = files.filter(f =>
    !search || f.originalName.toLowerCase().includes(search.toLowerCase())
  );

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success("URL copiada!");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca de Mídia</h1>
          <p className="text-sm text-gray-500 mt-0.5">{files.length} {files.length === 1 ? "arquivo" : "arquivos"}</p>
        </div>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
          <Upload size={18} /> Upload de Imagem
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging ? "border-[#E8B84B] bg-amber-50" : "border-gray-200 hover:border-[#E8B84B] hover:bg-amber-50/30"}`}>
        <Upload size={28} className={`mx-auto mb-2 ${dragging ? "text-[#E8B84B]" : "text-gray-300"}`} />
        <p className="text-sm text-gray-500">Arraste e solte imagens aqui ou <span className="text-[#E8B84B] font-medium">clique para selecionar</span></p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF, SVG · máx. 10MB por arquivo</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar imagens…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm bg-white" />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: GOLD }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ImageIcon size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma imagem encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(file => (
            <div key={file.id} className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition">
              <div
                className="relative aspect-square cursor-pointer bg-gray-50"
                onClick={() => setPreview({ url: file.url, name: file.originalName })}>
                <img src={file.url} alt={file.alt ?? file.originalName}
                  className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Ver</span>
                </div>
              </div>
              <div className="p-2 flex items-center gap-1">
                <span className="flex-1 text-xs text-gray-500 truncate">{file.originalName}</span>
                <button onClick={() => copyUrl(file.url)} title="Copiar URL"
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-[#E8B84B] hover:bg-amber-50 transition flex-shrink-0">
                  <Copy size={12} />
                </button>
                <button onClick={() => setConfirmDelete(file.id)} title="Excluir"
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"><X size={24} /></button>
            <img src={preview.url} alt={preview.name} className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-white/70 text-sm">{preview.name}</span>
              <button onClick={() => { copyUrl(preview.url); setPreview(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-sm hover:bg-white/30">
                <Copy size={14} /> Copiar URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900">Excluir imagem?</h3>
            <p className="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Cancelar</button>
              <button onClick={() => deleteMutation.mutate({ id: confirmDelete })}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
