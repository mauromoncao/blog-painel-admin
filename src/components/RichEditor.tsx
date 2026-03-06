/**
 * RichEditor — Editor rico tipo Word/Google Docs
 * Usa TipTap com extensões completas:
 * negrito, itálico, sublinhado, títulos, listas, alinhamento,
 * cor de texto, destaque, link, emoji, desfazer/refazer
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { useEffect, useState, useRef } from "react";

// ── Ícones SVG inline para não depender de lucide ──────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const EMOJIS = [
  "😀","😊","🎉","✅","❌","⚠️","💡","📌","🔍","📝","⚖️","🏛️","💼","📊","📈",
  "🤝","💰","🏠","👨‍⚖️","📋","🔒","✍️","📣","🌟","💎","🎯","🔑","📞","✉️","🗓️",
];

const FONT_SIZES = ["12","14","16","18","20","24","28","32","36","48"];

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichEditor({ value, onChange, placeholder = "Escreva o conteúdo da matéria aqui...", minHeight = 400 }: RichEditorProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [fontSize, setFontSize] = useState("16");
  const emojiRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
      Typography,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        style: `min-height:${minHeight}px; padding:1.25rem 1.5rem; outline:none; font-size:${fontSize}px; text-align:justify; line-height:1.8; font-family: 'Outfit', system-ui, sans-serif;`,
      },
    },
  });

  // Sincronizar value externo (ex: ao carregar post existente)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  // Fechar emoji ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const applyFontSize = (size: string) => {
    setFontSize(size);
    if (editor) {
      editor.chain().focus().setMark("textStyle", { fontSize: `${size}px` }).run();
    }
  };

  const setLink = () => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  if (!editor) return null;

  const GOLD = "#E8B84B";
  const NAVY = "#19385C";

  const btnCls = (active: boolean) =>
    `p-1.5 rounded transition-all text-sm font-medium ${
      active
        ? "text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div
      style={{
        border: "1.5px solid #d1d5db",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── BARRA DE FERRAMENTAS ── */}
      <div
        style={{
          background: "#f8f9fa",
          borderBottom: "1px solid #e5e7eb",
          padding: "6px 10px",
          display: "flex",
          flexWrap: "wrap",
          gap: "2px",
          alignItems: "center",
        }}
      >
        {/* Desfazer / Refazer */}
        <BtnGroup>
          <Btn title="Desfazer (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            ↩
          </Btn>
          <Btn title="Refazer (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            ↪
          </Btn>
        </BtnGroup>

        <Sep />

        {/* Cabeçalhos */}
        <BtnGroup>
          <Btn title="Parágrafo normal" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>¶</span>
          </Btn>
          {([1, 2, 3, 4] as const).map(l => (
            <Btn key={l} title={`Título H${l}`} active={editor.isActive("heading", { level: l })}
              onClick={() => editor.chain().focus().toggleHeading({ level: l }).run()}
            >
              <span style={{ fontSize: 11, fontWeight: 700 }}>H{l}</span>
            </Btn>
          ))}
        </BtnGroup>

        <Sep />

        {/* Tamanho de fonte */}
        <select
          title="Tamanho da fonte"
          value={fontSize}
          onChange={e => applyFontSize(e.target.value)}
          style={{
            fontSize: 12, padding: "2px 4px", borderRadius: 6,
            border: "1px solid #d1d5db", background: "#fff",
            cursor: "pointer", height: 28,
          }}
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>

        <Sep />

        {/* Formatação */}
        <BtnGroup>
          <Btn title="Negrito (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <strong style={{ fontSize: 13 }}>B</strong>
          </Btn>
          <Btn title="Itálico (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <em style={{ fontSize: 13 }}>I</em>
          </Btn>
          <Btn title="Sublinhado (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <span style={{ fontSize: 13, textDecoration: "underline" }}>U</span>
          </Btn>
          <Btn title="Riscado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <span style={{ fontSize: 13, textDecoration: "line-through" }}>S</span>
          </Btn>
        </BtnGroup>

        <Sep />

        {/* Alinhamento */}
        <BtnGroup>
          <Btn title="Alinhar à esquerda" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignIcon type="left" />
          </Btn>
          <Btn title="Centralizar" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignIcon type="center" />
          </Btn>
          <Btn title="Alinhar à direita" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignIcon type="right" />
          </Btn>
          <Btn title="Justificar" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            style={{ background: editor.isActive({ textAlign: "justify" }) ? GOLD : undefined }}
          >
            <AlignIcon type="justify" />
          </Btn>
        </BtnGroup>

        <Sep />

        {/* Listas */}
        <BtnGroup>
          <Btn title="Lista com marcadores" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <span style={{ fontSize: 14 }}>≡</span>
          </Btn>
          <Btn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <span style={{ fontSize: 13 }}>1.</span>
          </Btn>
          <Btn title="Citação (blockquote)" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <span style={{ fontSize: 16 }}>"</span>
          </Btn>
        </BtnGroup>

        <Sep />

        {/* Cores */}
        <BtnGroup>
          <label title="Cor do texto" style={{ position: "relative", cursor: "pointer" }}>
            <Btn as="span" title="Cor do texto">
              <span style={{ fontSize: 13, fontWeight: 700, borderBottom: `3px solid ${editor.getAttributes("textStyle").color || "#000"}` }}>A</span>
            </Btn>
            <input
              type="color"
              style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
              defaultValue="#000000"
              onChange={e => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>
          <label title="Destaque (marcador)" style={{ position: "relative", cursor: "pointer" }}>
            <Btn as="span" title="Destacar texto">
              <span style={{ fontSize: 13, background: "#fef08a", padding: "0 3px", borderRadius: 2 }}>ab</span>
            </Btn>
            <input
              type="color"
              style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
              defaultValue="#fef08a"
              onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            />
          </label>
        </BtnGroup>

        <Sep />

        {/* Link */}
        <div style={{ position: "relative" }}>
          <Btn
            title="Inserir link"
            active={editor.isActive("link")}
            onClick={() => { setShowLinkInput(v => !v); setLinkUrl(editor.getAttributes("link").href || ""); }}
          >
            <span style={{ fontSize: 13 }}>🔗</span>
          </Btn>
          {showLinkInput && (
            <div style={{
              position: "absolute", top: "110%", left: 0, zIndex: 100,
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 10, padding: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              display: "flex", gap: 6, width: 280,
            }}>
              <input
                autoFocus
                placeholder="https://..."
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setLink()}
                style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: 13 }}
              />
              <button onClick={setLink} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>OK</button>
              <button onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }}
                style={{ background: "#f3f4f6", color: "#666", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          )}
        </div>

        <Sep />

        {/* Linha horizontal */}
        <Btn title="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <span style={{ fontSize: 12 }}>—</span>
        </Btn>

        <Sep />

        {/* Emoji */}
        <div style={{ position: "relative" }} ref={emojiRef}>
          <Btn title="Inserir emoji" onClick={() => setShowEmoji(v => !v)}>
            <span style={{ fontSize: 15 }}>😊</span>
          </Btn>
          {showEmoji && (
            <div style={{
              position: "absolute", top: "110%", left: 0, zIndex: 100,
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 12, padding: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
              display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, width: 310,
            }}>
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { editor.chain().focus().insertContent(emoji).run(); setShowEmoji(false); }}
                  style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: 6, lineHeight: 1 }}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Limpar formatação */}
        <Btn title="Limpar formatação" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <span style={{ fontSize: 12 }}>✕fmt</span>
        </Btn>
      </div>

      {/* ── ÁREA DE EDIÇÃO ── */}
      <EditorContent editor={editor} />

      {/* Estilos globais do editor */}
      <style>{`
        .rich-editor-content:focus { outline: none; }
        .rich-editor-content p { margin: 0 0 0.75em 0; text-align: justify; }
        .rich-editor-content h1 { font-size: 2rem; font-weight: 700; color: #19385C; margin: 1.2em 0 0.5em; font-family: 'Cormorant Garamond', Georgia, serif; }
        .rich-editor-content h2 { font-size: 1.5rem; font-weight: 700; color: #19385C; margin: 1em 0 0.4em; border-bottom: 2px solid #E8B84B40; padding-bottom: 6px; font-family: 'Cormorant Garamond', Georgia, serif; }
        .rich-editor-content h3 { font-size: 1.25rem; font-weight: 700; color: #19385C; margin: 0.9em 0 0.3em; font-family: 'Cormorant Garamond', Georgia, serif; }
        .rich-editor-content h4 { font-size: 1.1rem; font-weight: 600; color: #19385C; margin: 0.8em 0 0.3em; }
        .rich-editor-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.5em 0; }
        .rich-editor-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5em 0; }
        .rich-editor-content li { margin-bottom: 0.3em; }
        .rich-editor-content blockquote { border-left: 4px solid #E8B84B; background: #fffbf0; margin: 1em 0; padding: 0.75em 1em; border-radius: 0 8px 8px 0; font-style: italic; color: #555; }
        .rich-editor-content a { color: #E8B84B; text-decoration: underline; }
        .rich-editor-content hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }
        .rich-editor-content mark { border-radius: 3px; padding: 0 2px; }
        .rich-editor-content strong { color: #19385C; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #adb5bd; pointer-events: none; height: 0; }
      `}</style>
    </div>
  );
}

// ── Componentes auxiliares da toolbar ────────────────────────────

function BtnGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 1, background: "#fff", borderRadius: 7, border: "1px solid #e5e7eb", padding: "1px" }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, active, title, disabled, as: Tag = "button", style }: any) {
  const GOLD = "#E8B84B";
  const NAVY = "#19385C";
  return (
    <Tag
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: 28, height: 28, padding: "0 6px",
        borderRadius: 6, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: active ? GOLD : "transparent",
        color: active ? NAVY : "#444",
        fontWeight: active ? 700 : 400,
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        ...style,
      }}
      onMouseEnter={(e: any) => { if (!active && !disabled) e.currentTarget.style.background = "#f3f4f6"; }}
      onMouseLeave={(e: any) => { e.currentTarget.style.background = active ? GOLD : "transparent"; }}
    >
      {children}
    </Tag>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 2px" }} />;
}

function AlignIcon({ type }: { type: "left" | "center" | "right" | "justify" }) {
  const lines = {
    left:    [[4,6,20,6],[4,10,16,10],[4,14,20,14],[4,18,14,18]],
    center:  [[4,6,20,6],[6,10,18,10],[4,14,20,14],[6,18,18,18]],
    right:   [[4,6,20,6],[8,10,20,10],[4,14,20,14],[10,18,20,18]],
    justify: [[4,6,20,6],[4,10,20,10],[4,14,20,14],[4,18,20,18]],
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {lines[type].map(([x1,y1,x2,y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
    </svg>
  );
}
