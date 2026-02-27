import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "../lib/trpc";
import { slugify, wordCount, readTime } from "../lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Globe, Eye, EyeOff, Image, Video, Tag,
  FileText, Settings, Search, Star, Calendar, Clock, BookOpen
} from "lucide-react";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

const TABS = [
  { id: "content", label: "Conteúdo",     icon: FileText },
  { id: "media",   label: "Mídia",        icon: Image },
  { id: "seo",     label: "SEO",          icon: Search },
  { id: "config",  label: "Configurações", icon: Settings },
];

const DEFAULT_CATEGORIES = [
  "tributario","defesa-fiscal","planejamento-patrimonial","sucessorio","imobiliario",
  "advocacia-publica","previdenciario","bancario","trabalhista","consumidor","familia","empresarial","atualidades"
];

type Status = "draft" | "published" | "scheduled" | "archived";

interface PostForm {
  title: string;
  subtitle: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageAlt: string;
  videoUrl: string;
  authorName: string;
  category: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  ctaText: string;
  ctaUrl: string;
  status: Status;
  isFeatured: boolean;
  publishedAt: string;
  scheduledAt: string;
}

const EMPTY: PostForm = {
  title: "", subtitle: "", slug: "", excerpt: "", content: "",
  coverImage: "", coverImageAlt: "", videoUrl: "", authorName: "",
  category: "", tags: "", metaTitle: "", metaDescription: "", metaKeywords: "",
  ogImage: "", ctaText: "", ctaUrl: "", status: "draft", isFeatured: false,
  publishedAt: "", scheduledAt: "",
};

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

export default function PostEditor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/blog/:id/edit");
  const postId = params?.id ? parseInt(params.id) : undefined;

  const [tab, setTab] = useState("content");
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [slugManual, setSlugManual] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: existingPost } = trpc.blog.getById.useQuery(
    { id: postId! }, { enabled: !!postId }
  );
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const upsertMutation = trpc.blog.upsert.useMutation({
    onSuccess: (post) => {
      toast.success(form.status === "published" ? "Publicado com sucesso!" : "Salvo como rascunho");
      if (!postId) setLocation(`/blog/${post.id}/edit`);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (existingPost) {
      setForm({
        title:          existingPost.title ?? "",
        subtitle:       existingPost.subtitle ?? "",
        slug:           existingPost.slug ?? "",
        excerpt:        existingPost.excerpt ?? "",
        content:        existingPost.content ?? "",
        coverImage:     existingPost.coverImage ?? "",
        coverImageAlt:  existingPost.coverImageAlt ?? "",
        videoUrl:       existingPost.videoUrl ?? "",
        authorName:     existingPost.authorName ?? "",
        category:       existingPost.category ?? "",
        tags:           existingPost.tags ?? "",
        metaTitle:      existingPost.metaTitle ?? "",
        metaDescription:existingPost.metaDescription ?? "",
        metaKeywords:   existingPost.metaKeywords ?? "",
        ogImage:        existingPost.ogImage ?? "",
        ctaText:        existingPost.ctaText ?? "",
        ctaUrl:         existingPost.ctaUrl ?? "",
        status:         (existingPost.status as Status) ?? "draft",
        isFeatured:     existingPost.isFeatured ?? false,
        publishedAt:    existingPost.publishedAt ? new Date(existingPost.publishedAt).toISOString().slice(0, 16) : "",
        scheduledAt:    existingPost.scheduledAt ? new Date(existingPost.scheduledAt).toISOString().slice(0, 16) : "",
      });
      setSlugManual(true);
    }
  }, [existingPost]);

  const set = (k: keyof PostForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleTitle = (v: string) => {
    set("title", v);
    if (!slugManual) set("slug", slugify(v));
  };

  const save = async (status: Status) => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); setTab("content"); return; }
    if (!form.slug.trim())  { toast.error("Slug é obrigatório"); setTab("content"); return; }
    setSaving(true);
    try {
      await upsertMutation.mutateAsync({
        id:   postId,
        ...form, status,
        publishedAt: form.publishedAt || undefined,
        scheduledAt: form.scheduledAt || undefined,
        isFeatured: form.isFeatured,
      });
      setForm(f => ({ ...f, status }));
    } finally {
      setSaving(false);
    }
  };

  const wc = wordCount(form.content);
  const rt = readTime(form.content);

  if (preview) return <PreviewMode form={form} onClose={() => setPreview(false)} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/blog")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft size={16} /> Postagens
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800">{postId ? "Editar Post" : "Nova Postagem"}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {wc > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              {wc} palavras · {rt} min de leitura
            </span>
          )}
          <button onClick={() => setPreview(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            <Eye size={15} /> Pré-visualizar
          </button>
          <button onClick={() => save("draft")} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Save size={15} /> Rascunho
          </button>
          <button onClick={() => save("published")} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 shadow"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
            <Globe size={15} /> {saving ? "Salvando…" : "Publicar"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition"
              style={{
                borderColor: tab === id ? GOLD : "transparent",
                color: tab === id ? GOLD : "#6B7280",
                background: tab === id ? "#FEFCE8" : "transparent",
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── CONTENT TAB ── */}
          {tab === "content" && (
            <div className="space-y-5">
              <div>
                <label className="label">Título *</label>
                <input value={form.title} onChange={e => handleTitle(e.target.value)}
                  placeholder="Título do artigo jurídico"
                  className="input text-lg font-semibold" />
              </div>
              <div>
                <label className="label">Subtítulo</label>
                <input value={form.subtitle} onChange={e => set("subtitle", e.target.value)}
                  placeholder="Subtítulo opcional"
                  className="input" />
              </div>
              <div>
                <label className="label">Slug / URL amigável *</label>
                <div className="flex items-center rounded-xl border-2 border-gray-200 focus-within:border-[#E8B84B] overflow-hidden">
                  <span className="px-3 py-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-200">/blog/</span>
                  <input value={form.slug}
                    onChange={e => { setSlugManual(true); set("slug", slugify(e.target.value)); }}
                    className="flex-1 px-3 py-3 text-sm focus:outline-none font-mono"
                    placeholder="meu-artigo-juridico" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.category} onChange={e => set("category", e.target.value)} className="input">
                    <option value="">Selecione uma categoria</option>
                    {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    {DEFAULT_CATEGORIES.filter(d => !categories.find(c => c.slug === d)).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tags (separadas por vírgula)</label>
                  <input value={form.tags} onChange={e => set("tags", e.target.value)}
                    placeholder="tributário, planejamento, IRPF"
                    className="input" />
                </div>
              </div>
              <div>
                <label className="label">Resumo / Excerpt</label>
                <textarea value={form.excerpt} onChange={e => set("excerpt", e.target.value)}
                  rows={3} placeholder="Breve descrição do artigo (exibida na listagem do blog)"
                  className="input resize-none" />
              </div>
              <div>
                <label className="label">Conteúdo (HTML)</label>
                <textarea value={form.content} onChange={e => set("content", e.target.value)}
                  rows={20} placeholder="<p>Corpo do artigo em HTML…</p>"
                  className="input resize-y font-mono text-sm" />
                <p className="text-xs text-gray-400 mt-1">{wc} palavras · {rt} min de leitura estimada</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Texto do CTA</label>
                  <input value={form.ctaText} onChange={e => set("ctaText", e.target.value)}
                    placeholder="Agende uma consulta"
                    className="input" />
                </div>
                <div>
                  <label className="label">URL do CTA</label>
                  <input value={form.ctaUrl} onChange={e => set("ctaUrl", e.target.value)}
                    placeholder="https://wa.me/55…"
                    className="input" />
                </div>
              </div>
              <div>
                <label className="label">Autor</label>
                <input value={form.authorName} onChange={e => set("authorName", e.target.value)}
                  placeholder="Dr. Mauro Monção"
                  className="input" />
              </div>
            </div>
          )}

          {/* ── MEDIA TAB ── */}
          {tab === "media" && (
            <div className="space-y-6">
              <div>
                <label className="label">URL da imagem de capa</label>
                <input value={form.coverImage} onChange={e => set("coverImage", e.target.value)}
                  placeholder="https://… ou /uploads/…"
                  className="input" />
                {form.coverImage && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 max-h-48">
                    <img src={form.coverImage} alt={form.coverImageAlt || "Capa"} className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Alt text da imagem de capa</label>
                <input value={form.coverImageAlt} onChange={e => set("coverImageAlt", e.target.value)}
                  placeholder="Descrição acessível da imagem"
                  className="input" />
              </div>
              <div>
                <label className="label">URL do Vídeo (YouTube, Vimeo ou link direto)</label>
                <input value={form.videoUrl} onChange={e => set("videoUrl", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="input" />
                {form.videoUrl && getEmbedUrl(form.videoUrl) && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 aspect-video">
                    <iframe src={getEmbedUrl(form.videoUrl)} className="w-full h-full" allowFullScreen title="Vídeo" />
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-medium mb-1">💡 Dica</p>
                <p>Use a <a href="/media" className="underline font-medium">Biblioteca de Mídia</a> para fazer upload de imagens e copiar a URL.</p>
              </div>
            </div>
          )}

          {/* ── SEO TAB ── */}
          {tab === "seo" && (
            <div className="space-y-5">
              <div>
                <label className="label">
                  Meta Título
                  <span className={`ml-2 text-xs font-normal ${form.metaTitle.length > 60 ? "text-red-500" : "text-gray-400"}`}>
                    {form.metaTitle.length}/60
                  </span>
                </label>
                <input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)}
                  maxLength={70} placeholder={form.title || "Meta título para SEO"}
                  className="input" />
              </div>
              <div>
                <label className="label">
                  Meta Descrição
                  <span className={`ml-2 text-xs font-normal ${form.metaDescription.length > 160 ? "text-red-500" : "text-gray-400"}`}>
                    {form.metaDescription.length}/160
                  </span>
                </label>
                <textarea value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)}
                  rows={3} maxLength={180} placeholder="Descrição para exibição no Google…"
                  className="input resize-none" />
              </div>
              <div>
                <label className="label">Palavras-chave (keywords)</label>
                <input value={form.metaKeywords} onChange={e => set("metaKeywords", e.target.value)}
                  placeholder="direito tributário, planejamento fiscal, advogado"
                  className="input" />
              </div>
              <div>
                <label className="label">URL da imagem OG (Open Graph)</label>
                <input value={form.ogImage} onChange={e => set("ogImage", e.target.value)}
                  placeholder="https://… (para compartilhamento em redes sociais)"
                  className="input" />
              </div>

              {/* SERP Preview */}
              {(form.title || form.metaTitle) && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pré-visualização Google</p>
                  <div className="text-xs text-green-700 truncate mb-0.5">mauromoncao.adv.br › blog › {form.slug || "artigo"}</div>
                  <div className="text-blue-600 text-base font-medium hover:underline cursor-pointer truncate">
                    {form.metaTitle || form.title || "Título do Artigo"}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                    {form.metaDescription || form.excerpt || "Descrição do artigo aparecerá aqui…"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIG TAB ── */}
          {tab === "config" && (
            <div className="space-y-5 max-w-lg">
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value as Status)} className="input">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="scheduled">Agendado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
              {form.status === "scheduled" && (
                <div>
                  <label className="label">Data/hora de publicação agendada</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={e => set("scheduledAt", e.target.value)} className="input" />
                </div>
              )}
              {form.status === "published" && (
                <div>
                  <label className="label">Data de publicação</label>
                  <input type="datetime-local" value={form.publishedAt} onChange={e => set("publishedAt", e.target.value)} className="input" />
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input type="checkbox" id="featured" checked={form.isFeatured}
                  onChange={e => set("isFeatured", e.target.checked)}
                  className="w-4 h-4 rounded accent-[#E8B84B]" />
                <label htmlFor="featured" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <Star size={16} color={GOLD} /> Marcar como destaque
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl text-sm">
                <div><span className="text-blue-600 font-medium">Palavras:</span> {wc}</div>
                <div><span className="text-blue-600 font-medium">Leitura:</span> {rt} min</div>
                <div><span className="text-blue-600 font-medium">Meta título:</span> {form.metaTitle.length}/60</div>
                <div><span className="text-blue-600 font-medium">Meta desc.:</span> {form.metaDescription.length}/160</div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => save("draft")} disabled={saving}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Salvar Rascunho
                </button>
                <button onClick={() => save("published")} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 shadow"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
                  {saving ? "Salvando…" : "Publicar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Preview Mode ────────────────────────────────────────────────
function PreviewMode({ form, onClose }: { form: PostForm; onClose: () => void }) {
  const embedUrl = getEmbedUrl(form.videoUrl);
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-sm font-medium text-gray-600">Pré-visualização do Post</span>
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium">
          <EyeOff size={15} /> Fechar preview
        </button>
      </div>
      <article className="max-w-3xl mx-auto px-6 py-12">
        {form.category && <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: GOLD }}>{form.category}</span>}
        <h1 className="text-4xl font-bold mt-2 mb-3 text-gray-900 leading-tight">{form.title || "Título do artigo"}</h1>
        {form.subtitle && <p className="text-xl text-gray-600 mb-6">{form.subtitle}</p>}
        {form.authorName && <p className="text-sm text-gray-400 mb-6">Por {form.authorName}</p>}
        {form.coverImage && (
          <img src={form.coverImage} alt={form.coverImageAlt || ""} className="w-full rounded-2xl mb-8 object-cover max-h-80" />
        )}
        {embedUrl && (
          <div className="aspect-video rounded-2xl overflow-hidden mb-8 shadow">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Vídeo" />
          </div>
        )}
        {form.content ? (
          <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: form.content }} />
        ) : (
          <p className="text-gray-400 italic">Conteúdo do artigo será exibido aqui…</p>
        )}
        {form.ctaText && form.ctaUrl && (
          <div className="mt-10 p-6 rounded-2xl text-center" style={{ background: `${NAVY}10`, border: `2px solid ${NAVY}20` }}>
            <p className="font-semibold text-gray-800 mb-3">Precisa de orientação jurídica?</p>
            <a href={form.ctaUrl} target="_blank" rel="noreferrer"
              className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
              {form.ctaText}
            </a>
          </div>
        )}
      </article>
    </div>
  );
}
