import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Settings as SettingsIcon, Globe, Phone, MapPin, BarChart2, Instagram, Facebook, Linkedin } from "lucide-react";

const GOLD = "#E8B84B";

const TABS = [
  { id: "contact",  label: "Contato",        icon: Phone },
  { id: "social",   label: "Redes Sociais",   icon: Instagram },
  { id: "address",  label: "Endereço",        icon: MapPin },
  { id: "tracking", label: "Rastreamento",    icon: BarChart2 },
  { id: "seo",      label: "SEO Global",      icon: Globe },
];

export default function Settings() {
  const [tab, setTab] = useState("contact");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  const { data: settings = [] } = trpc.settings.list.useQuery();
  const upsertMany = trpc.settings.upsertMany.useMutation({
    onSuccess: () => toast.success("Configurações salvas!"),
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.settingKey] = s.settingValue ?? ""; });
    setValues(map);
  }, [settings]);

  const set = (key: string, value: string) => setValues(v => ({ ...v, [key]: value }));
  const get = (key: string) => values[key] ?? "";

  const save = async () => {
    setSaving(true);
    try {
      const items = Object.entries(values).map(([key, value]) => ({ key, value }));
      await upsertMany.mutateAsync(items);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie informações do site e integrações</p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl font-semibold text-white shadow disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
          {saving ? "Salvando…" : "Salvar Tudo"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition"
              style={{ borderColor: tab === id ? GOLD : "transparent", color: tab === id ? GOLD : "#6B7280", background: tab === id ? "#FEFCE8" : "transparent" }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* ── CONTACT ── */}
          {tab === "contact" && (
            <>
              <Field label="Telefone / WhatsApp" k="phone" get={get} set={set} placeholder="(11) 99999-9999" />
              <Field label="E-mail de contato"   k="email" get={get} set={set} placeholder="contato@escritorio.adv.br" />
              <Field label="Horário de atendimento" k="business_hours" get={get} set={set} placeholder="Seg–Sex 9h–18h" />
              <Field label="Número do WhatsApp (com DDI)" k="whatsapp_number" get={get} set={set} placeholder="5511999999999" />
            </>
          )}

          {/* ── SOCIAL ── */}
          {tab === "social" && (
            <>
              <Field label="Instagram" k="instagram_url" get={get} set={set} placeholder="https://instagram.com/…" icon={<Instagram size={15} />} />
              <Field label="Facebook"  k="facebook_url"  get={get} set={set} placeholder="https://facebook.com/…" icon={<Facebook size={15} />} />
              <Field label="LinkedIn"  k="linkedin_url"  get={get} set={set} placeholder="https://linkedin.com/…" icon={<Linkedin size={15} />} />
              <Field label="YouTube"   k="youtube_url"   get={get} set={set} placeholder="https://youtube.com/@…" />
            </>
          )}

          {/* ── ADDRESS ── */}
          {tab === "address" && (
            <>
              <Field label="Logradouro"  k="address_street"  get={get} set={set} placeholder="Rua Dr. João Pessoa, 123 – Sala 45" />
              <Field label="Bairro"      k="address_district" get={get} set={set} placeholder="Centro" />
              <Field label="Cidade"      k="address_city"    get={get} set={set} placeholder="São Paulo" />
              <Field label="Estado"      k="address_state"   get={get} set={set} placeholder="SP" />
              <Field label="CEP"         k="address_zip"     get={get} set={set} placeholder="01310-100" />
              <Field label="URL do Mapa (Google Maps embed)" k="map_url" get={get} set={set} placeholder="https://www.google.com/maps/embed?…" />
            </>
          )}

          {/* ── TRACKING ── */}
          {tab === "tracking" && (
            <>
              <Field label="Google Analytics (G-XXXXXX)" k="ga_id" get={get} set={set} placeholder="G-XXXXXXXXXX" />
              <Field label="Meta Pixel ID"                k="meta_pixel_id" get={get} set={set} placeholder="1234567890" />
              <Field label="Google Tag Manager (GTM-XXX)" k="gtm_id" get={get} set={set} placeholder="GTM-XXXXXXX" />
            </>
          )}

          {/* ── SEO ── */}
          {tab === "seo" && (
            <>
              <Field label="Nome do site (para SEO)"  k="site_name"    get={get} set={set} placeholder="Mauro Monção Advogados Associados" />
              <Field label="Meta título padrão"       k="meta_title"   get={get} set={set} placeholder="Mauro Monção Advogados | Direito Tributário" />
              <TextArea label="Meta descrição padrão" k="meta_description" get={get} set={set} placeholder="Escritório especializado em…" />
              <Field label="URL do logo"              k="logo_url"     get={get} set={set} placeholder="https://…/logo.svg" />
              <Field label="URL do favicon"           k="favicon_url"  get={get} set={set} placeholder="https://…/favicon.ico" />
              <Field label="OG Image padrão"          k="og_image"     get={get} set={set} placeholder="https://…/og-default.jpg" />
            </>
          )}

          <div className="pt-2">
            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white shadow disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #d4a039)` }}>
              {saving ? "Salvando…" : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, k, get, set, placeholder, icon }: { label: string; k: string; get: (k: string) => string; set: (k: string, v: string) => void; placeholder?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 text-gray-700">{label}</label>
      <div className={`flex items-center rounded-xl border-2 border-gray-200 focus-within:border-[#E8B84B] overflow-hidden ${icon ? "" : ""}`}>
        {icon && <span className="px-3 text-gray-400">{icon}</span>}
        <input value={get(k)} onChange={e => set(k, e.target.value)} placeholder={placeholder}
          className="flex-1 px-4 py-3 text-sm focus:outline-none text-gray-800 bg-white" />
      </div>
    </div>
  );
}

function TextArea({ label, k, get, set, placeholder }: { label: string; k: string; get: (k: string) => string; set: (k: string, v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 text-gray-700">{label}</label>
      <textarea value={get(k)} onChange={e => set(k, e.target.value)} placeholder={placeholder} rows={3}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8B84B] focus:outline-none text-sm resize-none bg-white" />
    </div>
  );
}
