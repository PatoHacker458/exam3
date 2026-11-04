// ============================================================================
// MÓDULO KARDEX ACADÉMICO — CASCARÓN PARA INTEGRANTE 2
// Ruta: frontend/src/pages/KardexPage.jsx
// Endpoint disponible: await api.get('/sii/kardex')
// ============================================================================

import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export default function KardexPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Historial Académico
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
          Kardex Académico
        </h1>
      </div>

      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-10 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">
          Consulta de Historial Académico
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Esta sección mostrará la retícula de asignaturas acreditadas, créditos
          acumulados y promedios por semestre.
        </p>
      </div>
    </div>
  );
}
