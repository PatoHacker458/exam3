import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';

import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CalificacionesPage from './pages/CalificacionesPage.jsx';
import KardexPage from './pages/KardexPage.jsx';
import HorariosPage from './pages/HorariosPage.jsx';
import ExtraFeaturePage from './pages/ExtraFeaturePage.jsx';

/**
 * Layout principal adaptado para pantallas estándar y monitores Ultrawide (21:9 / 32:9).
 */
function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-20 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500 px-4">
          Sistema Integral de Información · Tecnológico Nacional de México en Celaya
        </footer>
      </div>
    </ProtectedRoute>
  );
}

/**
 * Define todas las rutas de la aplicación para evitar conflictos de merge entre integrantes.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/calificaciones"
        element={
          <ProtectedLayout>
            <CalificacionesPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/kardex"
        element={
          <ProtectedLayout>
            <KardexPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/horarios"
        element={
          <ProtectedLayout>
            <HorariosPage />
          </ProtectedLayout>
        }
      />
      <Route path="/horario" element={<Navigate to="/horarios" replace />} />

      <Route
        path="/lince-hub"
        element={
          <ProtectedLayout>
            <ExtraFeaturePage />
          </ProtectedLayout>
        }
      />
      <Route path="/extra" element={<Navigate to="/lince-hub" replace />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
