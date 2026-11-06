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

export default function Navbar({ theme = 'light' }) {
  const { userEmail, maskedEmail, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFullEmail, setShowFullEmail] = useState(false);

  const displayedEmail = showFullEmail && userEmail ? userEmail : maskedEmail;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-300 bg-zinc-100/95 backdrop-blur-md">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-20">
        <div className="flex items-center justify-between min-h-[68px] gap-4">
          {/* Identidad Institucional */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 shrink-0 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shadow-sm border border-emerald-800 shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-extrabold text-base sm:text-lg tracking-tight whitespace-nowrap leading-tight text-zinc-900">
                SII <span className="text-emerald-700">TecNM Celaya</span>
              </span>
              <span className="text-[11px] whitespace-nowrap leading-tight hidden sm:block text-zinc-600 font-medium">
                Sistema Integral de Información
              </span>
            </div>
          </NavLink>

          {/* Navegación Principal */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm'
                        : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200 border border-transparent'
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white border-zinc-300 text-zinc-800 text-xs whitespace-nowrap shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-mono font-bold">{displayedEmail}</span>
                <button
                  type="button"
                  onClick={() => setShowFullEmail((prev) => !prev)}
                  className="ml-0.5 cursor-pointer text-zinc-500 hover:text-zinc-800 transition-colors"
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
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 shadow-sm"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          {/* Botón Menú Móvil */}
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2.5 rounded-xl transition-colors text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200 border border-zinc-300"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Colapsable Móvil */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-300 px-4 sm:px-8 pt-3 pb-4 space-y-1.5 bg-zinc-100 shadow-lg">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'text-zinc-700 hover:bg-zinc-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-3 mt-2 border-t border-zinc-300 flex items-center justify-between gap-3">
            <span className="text-xs font-mono font-bold text-zinc-700 truncate">
              {displayedEmail}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 text-rose-700 bg-rose-100 border-rose-300 shadow-sm"
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