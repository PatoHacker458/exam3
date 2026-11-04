import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FileSpreadsheet,
  CalendarClock,
  Users,
  LogOut,
  Menu,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Inicio',
    icon: LayoutDashboard,
  },
  {
    to: '/calificaciones',
    label: 'Calificaciones',
    icon: GraduationCap,
  },
  {
    to: '/kardex',
    label: 'Kardex',
    icon: FileSpreadsheet,
  },
  {
    to: '/horarios',
    label: 'Horario',
    icon: CalendarClock,
  },
  {
    to: '/lince-hub',
    label: 'Comunidad / Asesorías',
    icon: Users,
  },
];

export default function Navbar() {
  const { userEmail, maskedEmail, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFullEmail, setShowFullEmail] = useState(false);

  const displayedEmail = showFullEmail && userEmail ? userEmail : maskedEmail;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-20">
        <div className="flex items-center justify-between min-h-[68px] gap-4">
          {/* Identidad Institucional en una sola línea sin cortarse */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 shrink-0 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30 shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap leading-tight">
                SII <span className="text-emerald-400">TecNM Celaya</span>
              </span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap leading-tight hidden sm:block">
                Sistema Integral de Información
              </span>
            </div>
          </NavLink>

          {/* Navegación Principal en una sola fila (Desktop / Ultrawide) */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Cuenta Institucional + Cerrar Sesión */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {userEmail && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-mono">{displayedEmail}</span>
                <button
                  type="button"
                  onClick={() => setShowFullEmail((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-200 ml-0.5 cursor-pointer"
                  title={
                    showFullEmail
                      ? 'Ocultar correo institucional'
                      : 'Mostrar correo institucional completo'
                  }
                >
                  {showFullEmail ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          {/* Botón Menú Móvil / Tablet */}
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Colapsable Móvil / Tablet */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 sm:px-8 pt-3 pb-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-mono truncate">
              {displayedEmail}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
