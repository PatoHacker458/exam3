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
          <h1 className="text-2xl font-bold text-zinc-900">
            Calificaciones del Periodo
          </h1>
          <p className="text-sm text-zinc-600">
            Consultando evaluaciones académicas...
          </p>
        </div>
        <CalificacionesSkeleton />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-2xl bg-zinc-100 border border-rose-300 p-8 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">
          No fue posible cargar las calificaciones
        </h2>
        <p className="text-sm text-zinc-600">{errorMsg}</p>
        <button
          type="button"
          onClick={fetchCalificaciones}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 bg-[#e6e6e6] min-h-screen p-4 sm:p-6 lg:p-8 rounded-xl">
      {/* Encabezado Sobrio e Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Seguimiento Académico
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-0.5 tracking-tight">
            Calificaciones del Periodo
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-zinc-200/80 border border-zinc-300 p-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-900'
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
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchCalificaciones}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Indicadores de Desempeño */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-zinc-100 border border-zinc-300 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Promedio del Periodo
            </p>
            <p className="text-2xl font-extrabold font-mono text-zinc-900 mt-1">
              {stats.average}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.total} {stats.total === 1 ? 'asignatura' : 'asignaturas'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setSelectedSemaphore((prev) => (prev === 'green' ? 'ALL' : 'green'))
          }
          className={`rounded-2xl p-5 text-left border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
            selectedSemaphore === 'green'
              ? 'bg-emerald-50 border-emerald-400'
              : 'bg-zinc-100 border-zinc-300 hover:border-emerald-400'
          }`}
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Desempeño Óptimo (≥ 80)
            </span>
            <p className="text-2xl font-extrabold font-mono text-zinc-900 mt-1">
              {stats.greenCount}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Acreditación destacada</p>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-600/80" />
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedSemaphore((prev) => (prev === 'yellow' ? 'ALL' : 'yellow'))
          }
          className={`rounded-2xl p-5 text-left border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
            selectedSemaphore === 'yellow'
              ? 'bg-amber-50 border-amber-400'
              : 'bg-zinc-100 border-zinc-300 hover:border-amber-400'
          }`}
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Regular / Pendiente (70–79)
            </span>
            <p className="text-2xl font-extrabold font-mono text-zinc-900 mt-1">
              {stats.yellowCount}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Aprobado o en evaluación</p>
          </div>
          <AlertCircle className="w-7 h-7 text-amber-600/80" />
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedSemaphore((prev) => (prev === 'red' ? 'ALL' : 'red'))
          }
          className={`rounded-2xl p-5 text-left border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
            selectedSemaphore === 'red'
              ? 'bg-rose-50 border-rose-400'
              : 'bg-zinc-100 border-zinc-300 hover:border-rose-400'
          }`}
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              En Riesgo (&lt; 70 / NA)
            </span>
            <p className="text-2xl font-extrabold font-mono text-zinc-900 mt-1">
              {stats.redCount}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Requiere atención</p>
          </div>
          <XCircle className="w-7 h-7 text-rose-600/80" />
        </button>
      </section>

      {/* Barra de Búsqueda y Selector de Periodo con Estilo Claro */}
      <section className="rounded-2xl bg-zinc-100 border border-zinc-300 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por asignatura, clave (ej. SCA-1002) o periodo..."
            aria-label="Buscar asignatura o periodo"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-shadow"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Filter className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              aria-label="Filtrar por periodo escolar"
              className="w-full sm:w-72 pl-9 pr-8 py-2.5 rounded-xl bg-white text-zinc-900 border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent cursor-pointer transition-shadow appearance-none"
            >
              <option value="ALL" className="bg-white text-zinc-900">
                Todos los periodos
              </option>
              {availablePeriods.map((period) => (
                <option
                  key={period}
                  value={period}
                  className="bg-white text-zinc-900"
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
              className="px-3.5 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer whitespace-nowrap border border-zinc-300"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </section>

      {/* Listado de Calificaciones (Grid Progresivo hasta Ultrawide) */}
      {filteredGrades.length === 0 ? (
        <div className="rounded-2xl bg-zinc-100 border border-zinc-300 p-10 text-center space-y-3 shadow-sm">
          <BookOpen className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-900">
            No se encontraron asignaturas con el criterio seleccionado
          </h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
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

            // Adaptación de los colores de semáforo para el tema claro
            const bgClass = semaphore.level === 'green' ? 'bg-emerald-50' : semaphore.level === 'red' ? 'bg-rose-50' : semaphore.level === 'yellow' ? 'bg-amber-50' : 'bg-white';
            const borderClass = semaphore.level === 'green' ? 'border-emerald-200' : semaphore.level === 'red' ? 'border-rose-200' : semaphore.level === 'yellow' ? 'border-amber-200' : 'border-zinc-300';
            const badgeClass = semaphore.level === 'green' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : semaphore.level === 'red' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300';
            const dotClass = semaphore.level === 'green' ? 'bg-emerald-500' : semaphore.level === 'red' ? 'bg-rose-500' : 'bg-amber-500';
            const textScoreClass = semaphore.level === 'green' ? 'text-emerald-700' : semaphore.level === 'red' ? 'text-rose-700' : semaphore.level === 'yellow' ? 'text-amber-700' : 'text-zinc-800';
            const barClass = semaphore.level === 'green' ? 'from-emerald-400 to-emerald-500' : semaphore.level === 'red' ? 'from-rose-400 to-rose-500' : 'from-amber-400 to-amber-500';

            return (
              <article
                key={item.id}
                className={`rounded-2xl ${bgClass} border ${borderClass} p-5 flex flex-col justify-between transition-all shadow-sm`}
              >
                <div className="space-y-3.5">
                  {/* Periodo + Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      title={safePeriodo}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-xs font-mono text-zinc-600 truncate max-w-[62%]"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{safePeriodo}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${badgeClass}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shadow-sm ${dotClass}`}
                      />
                      {semaphore.label}
                    </span>
                  </div>

                  {/* Asignatura + Promedio / Calificación */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 block truncate">
                        {safeClave}
                        {safeGrupo ? ` · Grupo ${safeGrupo}` : ''}
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 leading-snug break-words">
                        {safeNombreMateria}
                      </h3>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-white border border-zinc-300 text-center shrink-0 min-w-[70px] shadow-sm">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        {item.isPartialAvg && item.calificacionNumeric !== null
                          ? 'Prom. U.'
                          : 'Final'}
                      </span>
                      <span
                        className={`text-lg font-extrabold font-mono ${textScoreClass}`}
                      >
                        {item.calificacionDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Docente si existe */}
                  {safeDocente && (
                    <p className="text-xs text-zinc-600 flex items-center gap-1.5 font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{safeDocente}</span>
                    </p>
                  )}

                  {/* Desglose de Unidades / Parciales */}
                  {item.partials && item.partials.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
                        <span className="uppercase tracking-wider font-semibold">
                          Unidades
                        </span>
                        <span className="font-mono text-zinc-500 font-medium">
                          {item.evaluatedUnitsCount}/{item.totalUnitsCount} capturadas
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {item.partials.map((p) => {
                          const unitBadgeColor = !p.evaluated
                            ? 'border-zinc-300 bg-zinc-100 text-zinc-500'
                            : p.isNa || (typeof p.value === 'number' && p.value < 70)
                            ? 'border-rose-300 bg-rose-100 text-rose-800'
                            : typeof p.value === 'number' && p.value >= 80
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border-amber-300 bg-amber-100 text-amber-800';

                          return (
                            <div
                              key={p.label}
                              className={`px-2 py-1.5 rounded-lg border text-center font-mono shadow-sm ${unitBadgeColor}`}
                            >
                              <span className="block text-[10px] opacity-80 font-semibold">
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
                <div className="mt-5 pt-3 border-t border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-zinc-600 flex items-center gap-1">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {item.calificacionNumeric !== null
                        ? item.isPartialAvg
                          ? 'Promedio parcial'
                          : 'Calificación final'
                        : 'En espera de evaluación'}
                    </span>
                    <span className={`font-mono font-bold ${textScoreClass}`}>
                      {item.calificacionNumeric !== null
                        ? `${item.calificacionDisplay} / 100`
                        : item.calificacionDisplay}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden border border-zinc-300">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-500`}
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
        <section className="rounded-2xl bg-white border border-zinc-300 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-300 bg-zinc-100/80 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  <th className="py-3.5 px-4">Clave · Grupo</th>
                  <th className="py-3.5 px-4">Asignatura</th>
                  <th className="py-3.5 px-4">Periodo</th>
                  <th className="py-3.5 px-4">Unidades</th>
                  <th className="py-3.5 px-4">Promedio / Final</th>
                  <th className="py-3.5 px-4">Situación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {filteredGrades.map((item) => {
                  const { semaphore } = item;
                  const safeNombreMateria = extractText(
                    item.nombreMateria,
                    'Asignatura'
                  );
                  const safePeriodo = extractText(item.periodo, 'Semestre Actual');
                  const safeClave = extractText(item.clave, '');
                  const safeGrupo = extractText(item.grupo, '');

                  const textScoreClass = semaphore.level === 'green' ? 'text-emerald-700' : semaphore.level === 'red' ? 'text-rose-700' : semaphore.level === 'yellow' ? 'text-amber-700' : 'text-zinc-800';
                  const badgeClass = semaphore.level === 'green' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : semaphore.level === 'red' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300';
                  const dotClass = semaphore.level === 'green' ? 'bg-emerald-500' : semaphore.level === 'red' ? 'bg-rose-500' : 'bg-amber-500';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-600 font-medium whitespace-nowrap">
                        {safeClave}
                        {safeGrupo ? ` · ${safeGrupo}` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {safeNombreMateria}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-300 text-xs font-mono font-medium text-zinc-600">
                          {safePeriodo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.partials && item.partials.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.partials.map((p) => (
                              <span
                                key={p.label}
                                className={`px-2 py-0.5 rounded border text-xs font-mono shadow-sm ${
                                  p.evaluated
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : 'bg-zinc-100 border-zinc-300 text-zinc-500 font-medium'
                                }`}
                              >
                                <span className="font-semibold">{p.label}:</span> <strong>{p.display}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-base font-extrabold font-mono ${textScoreClass}`}
                        >
                          {item.calificacionDisplay}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${dotClass}`}
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