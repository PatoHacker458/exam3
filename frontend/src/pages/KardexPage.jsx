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
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }
  if (grade !== null && grade >= 70) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  }
  return 'bg-rose-100 text-rose-800 border-rose-300';
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
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 min-h-screen bg-[#e6e6e6]">
        <Skeleton className="h-10 w-64 mb-8 bg-zinc-300 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton
              key={item}
              className="h-32 w-full bg-zinc-300 rounded-xl"
            />
          ))}
        </div>
        <Skeleton className="h-96 w-full bg-zinc-300 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 text-zinc-900 bg-[#e6e6e6] min-h-screen rounded-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            Kardex Académico
          </h1>
          <p className="text-zinc-600 mt-1 font-medium">
            Historial completo y avance reticular
          </p>
        </div>
        <div
          className="flex bg-zinc-200/80 p-1 rounded-lg border border-zinc-300 shadow-sm"
          aria-label="Modo de visualización"
        >
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            aria-pressed={viewMode === 'grouped'}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors ${
              viewMode === 'grouped'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-300'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <List size={16} /> Agrupado
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-300'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Table2 size={16} /> Tabla
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-zinc-300 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Avance Reticular</p>
            <CheckCircle className="text-emerald-600" size={20} />
          </div>
          <h3 className="text-3xl font-extrabold text-zinc-900 mb-3">
            {data.porcentaje}%
          </h3>
          <div
            className="w-full bg-zinc-200 rounded-full h-2 border border-zinc-300"
            role="progressbar"
            aria-label="Avance reticular"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, data.porcentaje))}
          >
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, data.porcentaje))}%`,
              }}
            />
          </div>
        </div>
        <div className="bg-white border border-zinc-300 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Promedio General</p>
            <BookOpen className="text-blue-600" size={20} />
          </div>
          <h3 className="text-3xl font-extrabold text-zinc-900 font-mono">
            {promGeneral.toFixed(2)}
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Prom. Aprobadas: <span className="font-bold text-zinc-700">{promAprobadas.toFixed(2)}</span>
          </p>
        </div>
        <div className="bg-white border border-zinc-300 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
              Créditos Acumulados
            </p>
            <CheckCircle className="text-purple-600" size={20} />
          </div>
          <h3 className="text-3xl font-extrabold text-zinc-900">{totalCreditos}</h3>
        </div>
        <div className="bg-white border border-zinc-300 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
              Estado de Cursadas
            </p>
            <AlertTriangle className="text-amber-600" size={20} />
          </div>
          <h3 className="text-3xl font-extrabold text-zinc-900">
            {data.kardex.length}{' '}
            <span className="text-lg text-zinc-500 font-bold">Totales</span>
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            <span className="font-bold text-zinc-700">{repeticiones}</span> cursadas en Repetición
          </p>
        </div>
      </div>

      <div className="bg-white border border-zinc-300 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
        <label className="relative block">
          <span className="sr-only">Buscar materia o clave</span>
          <Search
            className="absolute left-3 top-3 text-zinc-400"
            size={18}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar materia o clave..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-shadow"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por periodo</span>
          <select
            value={filterPeriod}
            onChange={(event) => setFilterPeriod(event.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer transition-shadow"
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
            className="w-full px-4 py-2.5 bg-zinc-50 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer transition-shadow"
          >
            <option value="">Cualquier Modalidad</option>
            <option value="NORMAL / ORDINARIO">Ordinario</option>
            <option value="REPETICIÓN">Repetición</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-300 rounded-xl p-10 text-center text-zinc-500 font-medium shadow-sm">
          {data.kardex.length === 0
            ? 'No hay materias registradas en el kardex.'
            : 'No se encontraron materias con esos filtros.'}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-100/80 text-zinc-600 border-b border-zinc-300">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Clave</th>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Materia</th>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Semestre</th>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Periodo</th>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Modalidad</th>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Créditos</th>
                <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">
                  Calificación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filtered.map((item, index) => (
                <tr
                  key={`${item.clave_materia ?? 'materia'}-${item.periodo ?? index}-${index}`}
                  className="hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs font-semibold">
                    {item.clave_materia || '—'}
                  </td>
                  <td className="px-6 py-4 font-bold text-zinc-900">
                    {item.nombre_materia || 'Materia sin nombre'}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 font-medium">
                    {item.semestre ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 font-medium">
                    {item.periodo || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {String(item.descripcion ?? '').includes('REPETICIÓN') ||
                    String(item.periodo ?? '').includes('V') ? (
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded text-xs font-bold border border-amber-300">
                        {item.descripcion || 'Repetición'}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-medium text-xs">
                        {item.descripcion || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-600 font-bold">
                    {item.creditos ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded font-bold text-xs border font-mono ${getBadgeColor(item.calificacion)}`}
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
                className="bg-white border border-zinc-300 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="bg-zinc-100/80 px-6 py-4 border-b border-zinc-300 flex justify-between items-center">
                  <h3 className="text-lg font-extrabold text-zinc-900">
                    Semestre {semester}
                  </h3>
                  <span className="text-sm font-bold text-zinc-500">
                    {materiasSemestre.length} materias
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-zinc-50/50">
                  {materiasSemestre.map((item, index) => (
                    <article
                      key={`${item.clave_materia ?? 'materia'}-${item.periodo ?? index}-${index}`}
                      className="border border-zinc-300 bg-white p-4 rounded-lg flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded">
                            {item.clave_materia || 'Sin clave'}
                          </span>
                          <span
                            className={`px-2 py-1 rounded font-bold text-xs border font-mono ${getBadgeColor(item.calificacion)}`}
                          >
                            {item.calificacion ?? '—'}
                          </span>
                        </div>
                        <h4 className="font-bold text-zinc-900 text-sm mb-1 leading-snug">
                          {item.nombre_materia || 'Materia sin nombre'}
                        </h4>
                        {String(item.descripcion ?? '').includes('REPETICIÓN') && (
                          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Repetición
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-end mt-4 pt-3 border-t border-zinc-200 text-xs text-zinc-500 font-medium">
                        <span>Periodo: <span className="font-bold text-zinc-700">{item.periodo || '—'}</span></span>
                        <span><span className="font-bold text-zinc-700">{item.creditos ?? '—'}</span> Créditos</span>
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
            <section className="bg-white border border-zinc-300 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-zinc-100/80 px-6 py-4 border-b border-zinc-300">
                <h3 className="text-lg font-extrabold text-zinc-900">Sin semestre</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-zinc-50/50">
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
                      className="border border-zinc-300 bg-white p-4 rounded-lg hover:border-emerald-300 hover:shadow-md transition-all duration-200"
                    >
                      <p className="text-xs font-mono font-bold text-zinc-500">
                        {item.clave_materia || 'Sin clave'}
                      </p>
                      <h4 className="font-bold text-zinc-900 text-sm mt-2">
                        {item.nombre_materia || 'Materia sin nombre'}
                      </h4>
                      <p className="text-xs text-zinc-500 font-medium mt-3">
                        Periodo: <span className="font-bold text-zinc-700">{item.periodo || '—'}</span> · <span className="font-bold text-zinc-700">{item.creditos ?? '—'}</span> Créditos
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