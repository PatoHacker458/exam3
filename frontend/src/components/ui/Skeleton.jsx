import React from 'react';

/**
 * Bloque Skeleton base con animación pulse.
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-300/75 border border-zinc-400/30 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton especializado para la vista de Expediente del Estudiante.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando información del estudiante">
      {/* Banner principal de perfil */}
      <div className="rounded-2xl bg-zinc-100 border border-zinc-300 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="space-y-3 flex-1 w-full">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="rounded-2xl bg-zinc-100 border border-zinc-300 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Panel de expediente detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-zinc-100 border border-zinc-300 p-6 space-y-4">
          <Skeleton className="h-6 w-56" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((field) => (
              <Skeleton key={field} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-zinc-100 border border-zinc-300 p-6 space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton especializado para la vista de Calificaciones.
 */
export function CalificacionesSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando calificaciones del estudiante">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-zinc-100 border border-zinc-300 p-5 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-zinc-100 border border-zinc-300 p-4 flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((card) => (
          <div
            key={card}
            className="rounded-2xl bg-zinc-100 border border-zinc-300 p-5 space-y-4"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
              </div>
              <Skeleton className="h-10 w-14 rounded-xl" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
