import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Layers, Table2 } from 'lucide-react';
import api from '../services/api';
import Skeleton from '../components/ui/Skeleton';

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAY_LABELS = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
};
const CLASS_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-fuchsia-600',
];
const SLOT_MINUTES = 30;

function parseTime(value) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value ?? '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseRange(value) {
  if (typeof value !== 'string') return null;
  const [startValue, endValue, ...extra] = value.split('-');
  if (extra.length > 0) return null;
  const start = parseTime(startValue);
  const end = parseTime(endValue);
  return start !== null && end !== null && end > start ? { start, end } : null;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function normalizeSchedule(responseData) {
  const payload = responseData?.data ?? responseData;
  const block = Array.isArray(payload) ? payload[0] : payload;
  return block && typeof block === 'object' && !Array.isArray(block)
    ? block
    : null;
}

function normalizeClasses(schedule) {
  const rawClasses = Array.isArray(schedule?.horario) ? schedule.horario : [];

  return rawClasses
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const slots = DAYS.flatMap((day) => {
        const range = parseRange(item[day]);
        return range ? [{ day, ...range, room: item[`${day}_clave_salon`] }] : [];
      });
      return {
        ...item,
        key: `${item.clave_materia ?? item.nombre_materia ?? 'class'}-${index}`,
        color: CLASS_COLORS[index % CLASS_COLORS.length],
        slots,
        weeklyMinutes: slots.reduce(
          (total, slot) => total + slot.end - slot.start,
          0,
        ),
      };
    });
}

export default function HorariosPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('agenda');

  useEffect(() => {
    let active = true;

    const fetchHorarios = async () => {
      try {
        const response = await api.get('/sii/horarios');
        if (active) setData(normalizeSchedule(response.data));
      } catch (fetchError) {
        console.error('Error fetching horarios', fetchError);
        if (active) {
          setError(
            'No fue posible cargar el horario. Verifica tu conexión e inténtalo de nuevo.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchHorarios();
    return () => {
      active = false;
    };
  }, []);

  const classes = useMemo(() => normalizeClasses(data), [data]);
  const slots = useMemo(() => {
    const classSlots = classes.flatMap((item) => item.slots);
    if (classSlots.length === 0) return [];

    const earliest = Math.min(...classSlots.map((slot) => slot.start));
    const latest = Math.max(...classSlots.map((slot) => slot.end));
    const firstSlot = Math.floor(earliest / SLOT_MINUTES) * SLOT_MINUTES;
    const lastSlot = Math.ceil(latest / SLOT_MINUTES) * SLOT_MINUTES;
    return Array.from(
      { length: (lastSlot - firstSlot) / SLOT_MINUTES },
      (_, index) => firstSlot + index * SLOT_MINUTES,
    );
  }, [classes]);

  const totalWeeklyHours =
    classes.reduce((total, item) => total + item.weeklyMinutes, 0) / 60;
  const today = DAYS[new Date().getDay() - 1] ?? null;
  const period = data?.periodo ?? {};
  const plan = classes[0]?.nombre_plan || 'Sin Plan Registrado';
  const hasSchedule = classes.length > 0;

  if (loading) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8">
        <Skeleton className="h-10 w-64 mb-8 bg-slate-800 rounded-lg" />
        <Skeleton className="h-96 w-full bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 text-slate-100">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Horario de Clases
          </h1>
          <p className="text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span className="text-blue-400 font-medium">{plan}</span>
            <span className="text-slate-600 px-2" aria-hidden="true">
              •
            </span>
            {period.descripcion_periodo || 'Periodo no disponible'}
            {period.clave_periodo ? ` (${period.clave_periodo})` : ''}
          </p>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-lg" aria-label="Vista del horario">
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            aria-pressed={viewMode === 'agenda'}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
              viewMode === 'agenda'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={16} /> Agenda
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
            <Table2 size={16} /> Oficial
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

      {!error && !hasSchedule ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
          No hay horarios disponibles.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                <Layers size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                  Materias
                </p>
                <p className="text-2xl font-bold text-white">{classes.length}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                  Horas / Sem
                </p>
                <p className="text-2xl font-bold text-white">
                  {Number.isInteger(totalWeeklyHours)
                    ? totalWeeklyHours
                    : totalWeeklyHours.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {viewMode === 'agenda' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="w-20 bg-slate-950 border-b border-r border-slate-800 p-4"
                    >
                      Hora
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        scope="col"
                        className={`p-4 border-b border-r border-slate-800 text-center font-semibold ${
                          today === day
                            ? 'bg-blue-900/20 text-blue-400'
                            : 'bg-slate-950 text-slate-300'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((time) => (
                    <tr key={time}>
                      <th
                        scope="row"
                        className="border-b border-r border-slate-800 bg-slate-950 text-slate-500 text-center py-3 font-mono text-xs font-normal"
                      >
                        {formatTime(time)}
                      </th>
                      {DAYS.map((day) => {
                        const lesson = classes.find((item) =>
                          item.slots.some(
                            (slot) =>
                              slot.day === day &&
                              slot.start < time + SLOT_MINUTES &&
                              slot.end > time,
                          ),
                        );
                        const lessonSlot = lesson?.slots.find(
                          (slot) =>
                            slot.day === day &&
                            slot.start < time + SLOT_MINUTES &&
                            slot.end > time,
                        );
                        const beginsHere = lessonSlot?.start === time;

                        return (
                          <td
                            key={`${day}-${time}`}
                            className={`border-b border-r border-slate-800 p-1 relative h-16 ${
                              today === day ? 'bg-blue-900/5' : ''
                            }`}
                          >
                            {lesson && lessonSlot && (
                              <div
                                className={`h-full rounded-md px-2 py-1 flex flex-col justify-center ${lesson.color} text-white shadow-sm overflow-hidden leading-tight`}
                              >
                                {beginsHere && (
                                  <>
                                    <span className="font-bold text-xs truncate block">
                                      {lesson.nombre_materia || 'Materia'}
                                    </span>
                                    <div className="flex justify-between items-center mt-1 text-[10px] opacity-90 gap-1">
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin size={10} className="shrink-0" />
                                        {lessonSlot.room || 'Aula no indicada'}
                                      </span>
                                      <span className="shrink-0">
                                        {lesson.letra_grupo
                                          ? `Gpo ${lesson.letra_grupo}`
                                          : ''}
                                      </span>
                                    </div>
                                    <span className="text-[10px] opacity-80 mt-1">
                                      {formatTime(lessonSlot.start)}–
                                      {formatTime(lessonSlot.end)}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">Clave</th>
                    <th scope="col" className="px-6 py-4 font-medium">Materia</th>
                    <th scope="col" className="px-4 py-4 font-medium text-center">
                      Gpo
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        scope="col"
                        className="px-4 py-4 font-medium text-center"
                      >
                        {DAY_LABELS[day].slice(0, 3)}
                      </th>
                    ))}
                    <th scope="col" className="px-6 py-4 font-medium text-center">
                      Horas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {classes.map((item) => (
                    <tr
                      key={item.key}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {item.clave_materia || '—'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {item.nombre_materia || 'Materia sin nombre'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs">
                          {item.letra_grupo || '—'}
                        </span>
                      </td>
                      {DAYS.map((day) => {
                        const lesson = item.slots.find(
                          (slot) => slot.day === day,
                        );
                        return (
                          <td
                            key={day}
                            className="px-4 py-4 text-center"
                          >
                            {lesson ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-mono text-emerald-400">
                                  {formatTime(lesson.start)}–
                                  {formatTime(lesson.end)}
                                </span>
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {lesson.room || 'Aula no indicada'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center font-bold text-slate-400">
                        {item.weeklyMinutes / 60}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
