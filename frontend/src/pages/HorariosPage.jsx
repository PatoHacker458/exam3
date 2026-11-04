// ============================================================================
// MÓDULO HORARIO DE CLASES — CASCARÓN PARA INTEGRANTE 2
// Ruta: frontend/src/pages/HorariosPage.jsx
// Endpoint disponible: await api.get('/sii/horarios')
// ============================================================================

import React from 'react';
import { CalendarClock } from 'lucide-react';

export default function HorariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Carga Académica
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
          Horario de Clases
        </h1>
      </div>

      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-10 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center mx-auto text-sky-400">
          <CalendarClock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">
          Agenda Semanal del Semestre
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Esta sección mostrará la distribución semanal de clases organizadas por
          día, hora, aula y docente asignado.
        </p>
      </div>
    </div>
  );
}
