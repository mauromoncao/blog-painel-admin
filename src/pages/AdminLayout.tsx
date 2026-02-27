import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard, FileText, Plus, Tag, Image, HelpCircle, Users, Settings, LogOut,
  Menu, X, ChevronRight, Shield
} from "lucide-react";

const GOLD = "#E8B84B";
const NAVY = "#19385C";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { href: "/blog",       label: "Postagens",       icon: FileText },
  { href: "/blog/new",   label: "Nova Postagem",   icon: Plus },
  { href: "/categories", label: "Categorias",      icon: Tag },
  { href: "/media",      label: "Mídia",           icon: Image },
  { href: "/faq",        label: "FAQ",             icon: HelpCircle },
  { href: "/leads",      label: "Leads",           icon: Users },
  { href: "/settings",   label: "Configurações",   icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 256, background: `linear-gradient(180deg, ${NAVY} 0%, #0f2240 100%)` }}>
        
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: GOLD }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Mauro Monção</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Painel Admin</div>
          </div>
          <button className="ml-auto lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <button
                key={href}
                onClick={() => { setLocation(href); setSidebarOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? "rgba(232,184,75,0.15)" : "transparent",
                  color: active ? GOLD : "rgba(255,255,255,0.7)",
                  borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: GOLD }}>
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.name ?? "Admin"}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{user?.role}</div>
            </div>
            <button onClick={logout} className="text-white/40 hover:text-red-400 transition" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center h-16 px-6 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <button className="lg:hidden mr-4 text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {NAV.find(n => isActive(n.href))?.label ?? "Admin"}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">{user?.email}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
