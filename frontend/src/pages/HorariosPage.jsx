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
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 min-h-screen bg-[#e6e6e6]">
        <Skeleton className="h-10 w-64 mb-8 bg-zinc-300 rounded-lg" />
        <Skeleton className="h-96 w-full bg-zinc-300 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 text-zinc-900 bg-[#e6e6e6] min-h-screen rounded-xl">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            Horario de Clases
          </h1>
          <p className="text-zinc-600 mt-1 flex flex-wrap items-center gap-2 font-medium">
            <span className="text-emerald-700">{plan}</span>
            <span className="text-zinc-400 px-2" aria-hidden="true">
              •
            </span>
            {period.descripcion_periodo || 'Periodo no disponible'}
            {period.clave_periodo ? ` (${period.clave_periodo})` : ''}
          </p>
        </div>
        <div className="flex bg-zinc-200/80 p-1 rounded-lg border border-zinc-300 shadow-sm" aria-label="Vista del horario">
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            aria-pressed={viewMode === 'agenda'}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors ${
              viewMode === 'agenda'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-300'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar size={16} /> Agenda
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
            <Table2 size={16} /> Oficial
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

      {!error && !hasSchedule ? (
        <div className="rounded-xl border border-zinc-300 bg-zinc-100 p-8 text-center text-zinc-600 font-medium shadow-sm">
          No hay horarios disponibles.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-zinc-300 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg">
                <Layers size={24} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  Materias
                </p>
                <p className="text-2xl font-bold text-zinc-900">{classes.length}</p>
              </div>
            </div>
            <div className="bg-white border border-zinc-300 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  Horas / Sem
                </p>
                <p className="text-2xl font-bold text-zinc-900">
                  {Number.isInteger(totalWeeklyHours)
                    ? totalWeeklyHours
                    : totalWeeklyHours.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {viewMode === 'agenda' ? (
            <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="w-20 bg-zinc-100/80 border-b border-r border-zinc-300 p-4 font-bold text-zinc-600"
                    >
                      Hora
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        scope="col"
                        className={`p-4 border-b border-r border-zinc-300 text-center font-bold tracking-wide uppercase text-xs ${
                          today === day
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-zinc-100/80 text-zinc-600'
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
                        className="border-b border-r border-zinc-300 bg-zinc-50/50 text-zinc-500 text-center py-3 font-mono text-xs font-semibold"
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
                            className={`border-b border-r border-zinc-200 p-1 relative h-16 ${
                              today === day ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            {lesson && lessonSlot && (
                              <div
                                className={`h-full rounded-md px-2 py-1 flex flex-col justify-center ${lesson.color} text-white shadow-sm overflow-hidden leading-tight border border-white/20`}
                              >
                                {beginsHere && (
                                  <>
                                    <span className="font-bold text-xs truncate block">
                                      {lesson.nombre_materia || 'Materia'}
                                    </span>
                                    <div className="flex justify-between items-center mt-1 text-[10px] opacity-90 gap-1 font-medium">
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin size={10} className="shrink-0" />
                                        {lessonSlot.room || 'Aula no indicada'}
                                      </span>
                                      <span className="shrink-0 font-bold">
                                        {lesson.letra_grupo
                                          ? `Gpo ${lesson.letra_grupo}`
                                          : ''}
                                      </span>
                                    </div>
                                    <span className="text-[10px] opacity-80 mt-1 font-mono font-medium">
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
            <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-100/80 text-zinc-600 border-b border-zinc-300">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Clave</th>
                    <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Materia</th>
                    <th scope="col" className="px-4 py-4 font-bold uppercase tracking-wider text-xs text-center">
                      Gpo
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        scope="col"
                        className="px-4 py-4 font-bold uppercase tracking-wider text-xs text-center"
                      >
                        {DAY_LABELS[day].slice(0, 3)}
                      </th>
                    ))}
                    <th scope="col" className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">
                      Horas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {classes.map((item) => (
                    <tr
                      key={item.key}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs font-semibold">
                        {item.clave_materia || '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900">
                        {item.nombre_materia || 'Materia sin nombre'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-zinc-100 border border-zinc-300 text-zinc-700 px-2 py-1 rounded text-xs font-bold">
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
                                <span className="text-xs font-mono font-bold text-emerald-700">
                                  {formatTime(lesson.start)}–
                                  {formatTime(lesson.end)}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                  {lesson.room || 'Aula no indicada'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-300 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center font-extrabold text-zinc-700">
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