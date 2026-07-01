import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard, Building2, Users, GraduationCap, Layers, FileCheck2,
  Award, ShieldCheck, LogOut, BookOpen, ClipboardCheck, Menu, X,
} from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";
import { Button } from "./ui/button";

const NAV_BY_ROLE = {
  super_admin: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/companies", icon: Building2, label: "Empresas" },
    { to: "/app/trainers", icon: ShieldCheck, label: "Entrenadores" },
    { to: "/app/learners", icon: Users, label: "Aprendices" },
    { to: "/app/programming", icon: BookOpen, label: "Programación" },
    { to: "/app/groups", icon: Layers, label: "Grupos" },
    { to: "/app/documents", icon: FileCheck2, label: "Documentos" },
    { to: "/app/certificates", icon: Award, label: "Certificados" },
  ],
  empresa: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/learners", icon: Users, label: "Aprendices" },
    { to: "/app/programming", icon: BookOpen, label: "Programar curso" },
    { to: "/app/groups", icon: Layers, label: "Grupos" },
    { to: "/app/documents", icon: FileCheck2, label: "Documentos" },
    { to: "/app/certificates", icon: Award, label: "Certificados" },
  ],
  entrenador: [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/groups", icon: Layers, label: "Mis grupos" },
    { to: "/app/attendance", icon: ClipboardCheck, label: "Asistencia" },
  ],
  aprendiz: [
    { to: "/app", icon: LayoutDashboard, label: "Mi panel", end: true },
    { to: "/app/certificates", icon: Award, label: "Mis certificados" },
  ],
};

const ROLE_LABEL = {
  super_admin: "SUPER ADMIN",
  empresa: "EMPRESA",
  entrenador: "ENTRENADOR",
  aprendiz: "APRENDIZ",
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV_BY_ROLE[user.role] || [];

  const NavItems = ({ onClick }) => (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          onClick={onClick}
          data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g, '-')}`}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm ` +
            (isActive
              ? "bg-[#1E4484] text-white font-medium shadow-sm"
              : "text-[#3D3D3D] hover:bg-[#1E4484]/8 hover:text-[#1E4484]")
          }
        >
          <it.icon className="w-4 h-4 shrink-0" />
          <span className="font-data">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E2E8F0]">
        <div className="h-16 border-b border-[#E2E8F0] flex items-center px-4 bg-[#0F0F10]">
          <Logo size={36} textColor="text-white" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 pt-4">
            <div className="text-overline text-[#737373]">Navegación</div>
          </div>
          <NavItems />
        </div>
        <div className="p-3 border-t border-[#E2E8F0]">
          <div className="px-3 py-2 mb-2 mg-card">
            <div className="text-overline text-[#737373]">{ROLE_LABEL[user.role]}</div>
            <div className="text-sm font-medium text-[#3D3D3D] truncate" data-testid="topbar-username">{user.name}</div>
            <div className="text-xs text-[#737373] truncate">{user.email || user.document_number}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={async () => { await logout(); nav("/login"); }} data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white">
            <div className="h-16 border-b border-[#E2E8F0] flex items-center justify-between px-4 bg-[#0F0F10]">
              <Logo size={32} textColor="text-white" />
              <button onClick={() => setOpen(false)} className="text-white" data-testid="mobile-close-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavItems onClick={() => setOpen(false)} />
            <div className="p-3 border-t border-[#E2E8F0]">
              <Button variant="outline" size="sm" className="w-full" onClick={async () => { await logout(); nav("/login"); }}>
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 lg:px-8">
          <button className="lg:hidden p-2 text-[#3D3D3D]" onClick={() => setOpen(true)} data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block">
            <div className="text-overline text-[#737373]">Plataforma SST</div>
            <div className="font-display text-base text-[#3D3D3D]">Gestión Integral — Trabajo en Alturas</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs text-[#737373]">{ROLE_LABEL[user.role]}</span>
              <span className="text-sm font-medium text-[#3D3D3D]">{user.name}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#1E4484] text-white flex items-center justify-center font-bold text-sm">
              {(user.name || "U").substring(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
