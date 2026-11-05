import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  List,
  Search,
  Table2,
} from 'lucide-react';
import api from '../services/api';
import Skeleton from '../components/ui/Skeleton';

const getNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getBadgeColor = (calificacion) => {
  const grade = getNumber(calificacion);
  if (calificacion === 'AC' || grade >= 85) {
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  }
  if (grade !== null && grade >= 70) {
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }
  return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
};

export default function KardexPage() {
  const [data, setData] = useState({ kardex: [], porcentaje: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grouped');
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterDesc, setFilterDesc] = useState('');

  useEffect(() => {
    let active = true;

    const fetchKardex = async () => {
      try {
        const response = await api.get('/sii/kardex');
        const raw = response.data;
        const payload = raw?.data ?? raw;
        const porcentaje = getNumber(
          payload?.porcentaje_avance ?? raw?.porcentaje_avance,
        );

        if (active) {
          setData({
            porcentaje: porcentaje ?? 0,
            kardex: Array.isArray(payload?.kardex)
              ? payload.kardex
              : Array.isArray(raw?.kardex)
                ? raw.kardex
                : [],
          });
        }
      } catch (fetchError) {
        console.error('Error fetching kardex', fetchError);
        if (active) {
          setError(
            'No fue posible cargar el kardex. Verifica tu conexión e inténtalo de nuevo.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchKardex();
    return () => {
      active = false;
    };
  }, []);

  const approved = data.kardex.filter(
    (materia) =>
      materia.calificacion === 'AC' ||
      (getNumber(materia.calificacion) !== null &&
        getNumber(materia.calificacion) >= 70),
  );
  const numericApproved = approved.filter(
    (materia) =>
      materia.calificacion !== 'AC' &&
      getNumber(materia.calificacion) !== null,
  );
  const allNumeric = data.kardex.filter((materia) => {
    const grade = getNumber(materia.calificacion);
    return materia.calificacion !== 'AC' && grade !== null && grade !== 0;
  });

  const totalCreditos = approved.reduce(
    (total, materia) => total + (getNumber(materia.creditos) ?? 0),
    0,
  );
  const promAprobadas = numericApproved.length
    ? numericApproved.reduce(
        (total, materia) => total + getNumber(materia.calificacion),
        0,
      ) / numericApproved.length
    : 0;
  const promGeneral = allNumeric.length
    ? allNumeric.reduce(
        (total, materia) => total + getNumber(materia.calificacion),
        0,
      ) / allNumeric.length
    : 0;
  const repeticiones = data.kardex.filter((materia) =>
    String(materia.descripcion ?? '').includes('REPETICIÓN'),
  ).length;

  const filtered = useMemo(
    () =>
      data.kardex.filter((materia) => {
        const searchText = search.trim().toLowerCase();
        const name = String(materia.nombre_materia ?? '').toLowerCase();
        const code = String(materia.clave_materia ?? '').toLowerCase();
        const matchSearch =
          !searchText || name.includes(searchText) || code.includes(searchText);
        const matchPeriod = filterPeriod
          ? String(materia.periodo ?? '') === filterPeriod
          : true;
        const matchDesc = filterDesc
          ? String(materia.descripcion ?? '') === filterDesc
          : true;
        return matchSearch && matchPeriod && matchDesc;
      }),
    [data.kardex, filterDesc, filterPeriod, search],
  );

  const uniquePeriods = [
    ...new Set(
      data.kardex
        .map((materia) => materia.periodo)
        .filter((periodo) => periodo !== null && periodo !== undefined && periodo !== ''),
    ),
  ].sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
  const groupedSemesters = [
    ...new Set(
      filtered
        .map((materia) => materia.semestre)
        .filter((semestre) => semestre !== null && semestre !== undefined && semestre !== ''),
    ),
  ].sort((a, b) => {
    const semesterA = getNumber(a);
    const semesterB = getNumber(b);
    return semesterA !== null && semesterB !== null
      ? semesterA - semesterB
      : String(a).localeCompare(String(b), 'es', { numeric: true });
  });

  if (loading) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8">
        <Skeleton className="h-10 w-64 mb-8 bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton
              key={item}
              className="h-32 w-full bg-slate-800 rounded-xl"
            />
          ))}
        </div>
        <Skeleton className="h-96 w-full bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Kardex Académico
          </h1>
          <p className="text-slate-400 mt-1">
            Historial completo y avance reticular
          </p>
        </div>
        <div
          className="flex bg-slate-800 p-1 rounded-lg"
          aria-label="Modo de visualización"
        >
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            aria-pressed={viewMode === 'grouped'}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List size={16} /> Agrupado
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table2 size={16} /> Tabla
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-400 text-sm font-medium">Avance Reticular</p>
            <CheckCircle className="text-emerald-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-white mb-3">
            {data.porcentaje}%
          </h3>
          <div
            className="w-full bg-slate-800 rounded-full h-2"
            role="progressbar"
            aria-label="Avance reticular"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, data.porcentaje))}
          >
            <div
              className="bg-emerald-500 h-2 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, data.porcentaje))}%`,
              }}
            />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-400 text-sm font-medium">Promedio General</p>
            <BookOpen className="text-blue-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-white">
            {promGeneral.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Prom. Aprobadas: {promAprobadas.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-400 text-sm font-medium">
              Créditos Acumulados
            </p>
            <CheckCircle className="text-emerald-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalCreditos}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-400 text-sm font-medium">
              Estado de Cursadas
            </p>
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-white">
            {data.kardex.length}{' '}
            <span className="text-lg text-slate-500 font-normal">Totales</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {repeticiones} cursadas en Repetición
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <label className="relative block">
          <span className="sr-only">Buscar materia o clave</span>
          <Search
            className="absolute left-3 top-3 text-slate-500"
            size={18}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar materia o clave..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por periodo</span>
          <select
            value={filterPeriod}
            onChange={(event) => setFilterPeriod(event.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos los Periodos</option>
            {uniquePeriods.map((periodo) => (
              <option key={periodo} value={periodo}>
                {periodo}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrar por modalidad</span>
          <select
            value={filterDesc}
            onChange={(event) => setFilterDesc(event.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Cualquier Modalidad</option>
            <option value="NORMAL / ORDINARIO">Ordinario</option>
            <option value="REPETICIÓN">Repetición</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
          {data.kardex.length === 0
            ? 'No hay materias registradas en el kardex.'
            : 'No se encontraron materias con esos filtros.'}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Clave</th>
                <th scope="col" className="px-6 py-4 font-medium">Materia</th>
                <th scope="col" className="px-6 py-4 font-medium">Semestre</th>
                <th scope="col" className="px-6 py-4 font-medium">Periodo</th>
                <th scope="col" className="px-6 py-4 font-medium">Modalidad</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Créditos</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">
                  Calificación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((item, index) => (
                <tr
                  key={`${item.clave_materia ?? 'materia'}-${item.periodo ?? index}-${index}`}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                    {item.clave_materia || '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {item.nombre_materia || 'Materia sin nombre'}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {item.semestre ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {item.periodo || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {String(item.descripcion ?? '').includes('REPETICIÓN') ||
                    String(item.periodo ?? '').includes('V') ? (
                      <span className="bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded text-xs border border-amber-500/20">
                        {item.descripcion || 'Repetición'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        {item.descripcion || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">
                    {item.creditos ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded font-bold text-xs border ${getBadgeColor(item.calificacion)}`}
                    >
                      {item.calificacion ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSemesters.map((semester) => {
            const materiasSemestre = filtered.filter(
              (materia) => materia.semestre === semester,
            );
            return (
              <section
                key={semester}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">
                    Semestre {semester}
                  </h3>
                  <span className="text-sm text-slate-400">
                    {materiasSemestre.length} materias
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {materiasSemestre.map((item, index) => (
                    <article
                      key={`${item.clave_materia ?? 'materia'}-${item.periodo ?? index}-${index}`}
                      className="border border-slate-800 bg-slate-900/50 p-4 rounded-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                            {item.clave_materia || 'Sin clave'}
                          </span>
                          <span
                            className={`px-2 py-1 rounded font-bold text-xs border ${getBadgeColor(item.calificacion)}`}
                          >
                            {item.calificacion ?? '—'}
                          </span>
                        </div>
                        <h4 className="font-medium text-slate-200 text-sm mb-1 leading-snug">
                          {item.nombre_materia || 'Materia sin nombre'}
                        </h4>
                        {String(item.descripcion ?? '').includes('REPETICIÓN') && (
                          <span className="text-[10px] uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Repetición
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-800/50 text-xs text-slate-500">
                        <span>Periodo: {item.periodo || '—'}</span>
                        <span>{item.creditos ?? '—'} Créditos</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          {filtered.some(
            (materia) =>
              materia.semestre === null || materia.semestre === undefined || materia.semestre === '',
          ) && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Sin semestre</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filtered
                  .filter(
                    (materia) =>
                      materia.semestre === null ||
                      materia.semestre === undefined ||
                      materia.semestre === '',
                  )
                  .map((item, index) => (
                    <article
                      key={`${item.clave_materia ?? 'materia'}-${item.periodo ?? index}-${index}`}
                      className="border border-slate-800 bg-slate-900/50 p-4 rounded-lg"
                    >
                      <p className="text-xs font-mono text-slate-500">
                        {item.clave_materia || 'Sin clave'}
                      </p>
                      <h4 className="font-medium text-slate-200 text-sm mt-2">
                        {item.nombre_materia || 'Materia sin nombre'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-3">
                        Periodo: {item.periodo || '—'} · {item.creditos ?? '—'} Créditos
                      </p>
                    </article>
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
