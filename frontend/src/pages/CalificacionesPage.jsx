import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  Table2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookOpen,
  Calendar,
  UserCheck,
  Award,
} from 'lucide-react';
import api from '../services/api.js';
import { CalificacionesSkeleton } from '../components/ui/Skeleton.jsx';
import { normalizeCalificacionesList, extractText } from '../utils/siiParser.js';

export default function CalificacionesPage() {
  const [rawCalificaciones, setRawCalificaciones] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [selectedSemaphore, setSelectedSemaphore] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards');

  const fetchCalificaciones = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await api.get('/sii/calificaciones');
      setRawCalificaciones(response.data);
    } catch (error) {
      const serverMsg = extractText(error?.response?.data?.message, '');
      setErrorMsg(
        serverMsg ||
          'No se pudieron obtener las calificaciones del estudiante en este momento.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalificaciones();
  }, [fetchCalificaciones]);

  const allGrades = useMemo(
    () => normalizeCalificacionesList(rawCalificaciones),
    [rawCalificaciones]
  );

  // Garantiza que las opciones del <select> sean únicamente strings limpios
  const availablePeriods = useMemo(() => {
    const set = new Set();
    allGrades.forEach((item) => {
      const cleanPeriod = extractText(item.periodo, '');
      if (cleanPeriod && !cleanPeriod.includes('[object Object]')) {
        set.add(cleanPeriod);
      }
    });
    return Array.from(set);
  }, [allGrades]);

  // Filtrado en tiempo real por asignatura, periodo, clave, grupo o semáforo
  const filteredGrades = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allGrades.filter((item) => {
      const materiaStr = extractText(item.nombreMateria, '').toLowerCase();
      const periodoStr = extractText(item.periodo, '').toLowerCase();
      const claveStr = extractText(item.clave, '').toLowerCase();
      const docenteStr = extractText(item.docente, '').toLowerCase();

      const matchesQuery =
        !query ||
        materiaStr.includes(query) ||
        periodoStr.includes(query) ||
        claveStr.includes(query) ||
        docenteStr.includes(query);

      const matchesPeriod =
        selectedPeriod === 'ALL' ||
        extractText(item.periodo, '') === selectedPeriod;

      const matchesSemaphore =
        selectedSemaphore === 'ALL' || item.semaphore.level === selectedSemaphore;

      return matchesQuery && matchesPeriod && matchesSemaphore;
    });
  }, [allGrades, searchTerm, selectedPeriod, selectedSemaphore]);

  const stats = useMemo(() => {
    const scored = filteredGrades.filter(
      (g) =>
        typeof g.calificacionNumeric === 'number' &&
        !Number.isNaN(g.calificacionNumeric)
    );
    const average =
      scored.length > 0
        ? (
            scored.reduce((acc, curr) => acc + curr.calificacionNumeric, 0) /
            scored.length
          ).toFixed(2)
        : 'Pendiente';

    const greenCount = filteredGrades.filter(
      (g) => g.semaphore.level === 'green'
    ).length;
    const yellowCount = filteredGrades.filter(
      (g) => g.semaphore.level === 'yellow'
    ).length;
    const redCount = filteredGrades.filter(
      (g) => g.semaphore.level === 'red'
    ).length;

    return {
      total: filteredGrades.length,
      average,
      greenCount,
      yellowCount,
      redCount,
    };
  }, [filteredGrades]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Calificaciones del Periodo
          </h1>
          <p className="text-sm text-slate-400">
            Consultando evaluaciones académicas...
          </p>
        </div>
        <CalificacionesSkeleton />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-rose-500/30 p-8 text-center max-w-2xl mx-auto my-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          No fue posible cargar las calificaciones
        </h2>
        <p className="text-sm text-slate-300">{errorMsg}</p>
        <button
          type="button"
          onClick={fetchCalificaciones}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Sobrio e Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Seguimiento Académico
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Calificaciones del Periodo
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchCalificaciones}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Indicadores de Desempeño */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Promedio del Periodo
            </p>
            <p className="text-2xl font-extrabold font-mono text-white mt-1">
              {stats.average}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.total} {stats.total === 1 ? 'asignatura' : 'asignaturas'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setSelectedSemaphore((prev) => (prev === 'green' ? 'ALL' : 'green'))
          }
          className={`rounded-2xl p-5 text-left border transition-all cursor-pointer flex items-center justify-between ${
            selectedSemaphore === 'green'
              ? 'bg-emerald-500/15 border-emerald-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Desempeño Óptimo (≥ 80)
            </span>
            <p className="text-2xl font-extrabold font-mono text-white mt-1">
              {stats.greenCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Acreditación destacada</p>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-400/80" />
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedSemaphore((prev) => (prev === 'yellow' ? 'ALL' : 'yellow'))
          }
          className={`rounded-2xl p-5 text-left border transition-all cursor-pointer flex items-center justify-between ${
            selectedSemaphore === 'yellow'
              ? 'bg-amber-500/15 border-amber-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Regular / Pendiente (70–79)
            </span>
            <p className="text-2xl font-extrabold font-mono text-white mt-1">
              {stats.yellowCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Aprobado o en evaluación</p>
          </div>
          <AlertCircle className="w-7 h-7 text-amber-400/80" />
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedSemaphore((prev) => (prev === 'red' ? 'ALL' : 'red'))
          }
          className={`rounded-2xl p-5 text-left border transition-all cursor-pointer flex items-center justify-between ${
            selectedSemaphore === 'red'
              ? 'bg-rose-500/15 border-rose-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              En Riesgo (&lt; 70 / NA)
            </span>
            <p className="text-2xl font-extrabold font-mono text-white mt-1">
              {stats.redCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Requiere atención</p>
          </div>
          <XCircle className="w-7 h-7 text-rose-400/80" />
        </button>
      </section>

      {/* Barra de Búsqueda y Selector de Periodo con Estilo Oscuro */}
      <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por asignatura, clave (ej. SCA-1002) o periodo..."
            aria-label="Buscar asignatura o periodo"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              aria-label="Filtrar por periodo escolar"
              style={{ colorScheme: 'dark' }}
              className="w-full sm:w-72 pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-100">
                Todos los periodos
              </option>
              {availablePeriods.map((period) => (
                <option
                  key={period}
                  value={period}
                  className="bg-slate-900 text-slate-100"
                >
                  {period}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedPeriod !== 'ALL' || selectedSemaphore !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedPeriod('ALL');
                setSelectedSemaphore('ALL');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </section>

      {/* Listado de Calificaciones (Grid Progresivo hasta Ultrawide) */}
      {filteredGrades.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            No se encontraron asignaturas con el criterio seleccionado
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Intenta modificar el texto de búsqueda o cambiar el filtro de desempeño.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filteredGrades.map((item) => {
            const { semaphore } = item;
            const StatusIcon = semaphore.Icon;
            const progressWidth =
              item.calificacionNumeric !== null
                ? Math.min(100, Math.max(8, item.calificacionNumeric))
                : 25;

            const safeNombreMateria = extractText(item.nombreMateria, 'Asignatura');
            const safePeriodo = extractText(item.periodo, 'Semestre Actual');
            const safeClave = extractText(item.clave, '');
            const safeGrupo = extractText(item.grupo, '');
            const safeDocente = extractText(item.docente, '');

            return (
              <article
                key={item.id}
                className={`rounded-2xl bg-slate-900/90 border ${semaphore.cardBorderClass} p-5 flex flex-col justify-between transition-all shadow-lg`}
              >
                <div className="space-y-3.5">
                  {/* Periodo + Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      title={safePeriodo}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 truncate max-w-[62%]"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{safePeriodo}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${semaphore.badgeClass}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shadow-sm ${semaphore.dotClass}`}
                      />
                      {semaphore.label}
                    </span>
                  </div>

                  {/* Asignatura + Promedio / Calificación */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/90 block truncate">
                        {safeClave}
                        {safeGrupo ? ` · Grupo ${safeGrupo}` : ''}
                      </span>
                      <h3 className="text-base font-bold text-white leading-snug break-words">
                        {safeNombreMateria}
                      </h3>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0 min-w-[70px]">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                        {item.isPartialAvg && item.calificacionNumeric !== null
                          ? 'Prom. U.'
                          : 'Final'}
                      </span>
                      <span
                        className={`text-lg font-extrabold font-mono ${semaphore.scoreTextClass}`}
                      >
                        {item.calificacionDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Docente si existe */}
                  {safeDocente && (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{safeDocente}</span>
                    </p>
                  )}

                  {/* Desglose de Unidades / Parciales (calificaiones del SII ITC) */}
                  {item.partials && item.partials.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span className="uppercase tracking-wider font-semibold">
                          Unidades
                        </span>
                        <span className="font-mono text-slate-400">
                          {item.evaluatedUnitsCount}/{item.totalUnitsCount} capturadas
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {item.partials.map((p) => {
                          const unitBadgeColor = !p.evaluated
                            ? 'border-slate-800 bg-slate-950/60 text-slate-500'
                            : p.isNa || (typeof p.value === 'number' && p.value < 70)
                            ? 'border-rose-500/35 bg-rose-500/10 text-rose-300'
                            : typeof p.value === 'number' && p.value >= 80
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

                          return (
                            <div
                              key={p.label}
                              className={`px-2 py-1.5 rounded-lg border text-center font-mono ${unitBadgeColor}`}
                            >
                              <span className="block text-[10px] opacity-75">
                                {p.label}
                              </span>
                              <span className="text-xs font-bold">{p.display}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra de Desempeño */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {item.calificacionNumeric !== null
                        ? item.isPartialAvg
                          ? 'Promedio parcial'
                          : 'Calificación final'
                        : 'En espera de evaluación'}
                    </span>
                    <span className={`font-mono font-bold ${semaphore.scoreTextClass}`}>
                      {item.calificacionNumeric !== null
                        ? `${item.calificacionDisplay} / 100`
                        : item.calificacionDisplay}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${semaphore.barClass} transition-all duration-500`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* VISTA DE TABLA */
        <section className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Clave · Grupo</th>
                  <th className="py-3.5 px-4">Asignatura</th>
                  <th className="py-3.5 px-4">Periodo</th>
                  <th className="py-3.5 px-4">Unidades</th>
                  <th className="py-3.5 px-4">Promedio / Final</th>
                  <th className="py-3.5 px-4">Situación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredGrades.map((item) => {
                  const { semaphore } = item;
                  const safeNombreMateria = extractText(
                    item.nombreMateria,
                    'Asignatura'
                  );
                  const safePeriodo = extractText(item.periodo, 'Semestre Actual');
                  const safeClave = extractText(item.clave, '');
                  const safeGrupo = extractText(item.grupo, '');

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {safeClave}
                        {safeGrupo ? ` · ${safeGrupo}` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {safeNombreMateria}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                          {safePeriodo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.partials && item.partials.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.partials.map((p) => (
                              <span
                                key={p.label}
                                className={`px-2 py-0.5 rounded border text-xs font-mono ${
                                  p.evaluated
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                                }`}
                              >
                                {p.label}: <strong>{p.display}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-base font-extrabold font-mono ${semaphore.scoreTextClass}`}
                        >
                          {item.calificacionDisplay}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${semaphore.badgeClass}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${semaphore.dotClass}`}
                          />
                          {semaphore.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
