// ============================================================================
// MÓDULO COMUNIDAD / ASESORÍAS — CASCARÓN PARA INTEGRANTE 2
// Ruta: frontend/src/pages/ExtraFeaturePage.jsx
// Backend propio: backend/src/routes/extra.routes.js (/api/extra/*)
// Edge Function: supabase/functions/academic-advisor/index.ts
// ============================================================================

import React from 'react';
import { Users } from 'lucide-react';

export default function ExtraFeaturePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Servicios Estudiantiles
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
          Comunidad y Asesorías Académicas
        </h1>
      </div>

      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-10 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">
          Espacio de Apoyo y Seguimiento Estudiantil
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Módulo de herramientas complementarias, asesoría entre pares y recursos
          para la comunidad estudiantil del TecNM en Celaya.
        </p>
      </div>
    </div>
  );
}
