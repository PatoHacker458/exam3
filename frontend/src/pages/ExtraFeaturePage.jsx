import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bookmark,
  Calendar,
  CheckCircle2,
  Info,
  Plus,
  Settings,
  Users,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';

const INITIAL_FORM = {
  materia: '',
  mentor: '',
  modalidad: 'Presencial',
  salon: '',
  horario: '',
  cupo_maximo: 10,
};

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getPayload(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getCalificaciones(value, depth = 0) {
  if (depth > 4 || !value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      item && Array.isArray(item.materias)
        ? getCalificaciones(item.materias, depth + 1)
        : [item],
    );
  }
  if (typeof value !== 'object') return [];

  for (const key of ['calificaciones', 'calificaiones', 'materias', 'data']) {
    if (value[key] && typeof value[key] === 'object') {
      const entries = getCalificaciones(value[key], depth + 1);
      if (entries.length > 0) return entries;
    }
  }
  return [];
}

export default function ExtraFeaturePage() {
  const { userEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('asesorias');
  const [asesoriasSubTab, setAsesoriasSubTab] = useState('explorar');
  const [asesorias, setAsesorias] = useState([]);
  const [misAsesorias, setMisAsesorias] = useState([]);
  const [diagnostico, setDiagnostico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [misAsesoriasError, setMisAsesoriasError] = useState('');
  const [diagnosticoError, setDiagnosticoError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [newForm, setNewForm] = useState(INITIAL_FORM);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setListError('');
    setDiagnosticoError('');

    const [
      asesoriasResult,
      misAsesoriasResult,
      calificacionesResult,
      kardexResult,
    ] =
      await Promise.allSettled([
        api.get('/extra/asesorias'),
        api.get('/extra/mis-asesorias', {
          params: { alumno_id: userEmail },
        }),
        api.get('/sii/calificaciones'),
        api.get('/sii/kardex'),
      ]);

    if (asesoriasResult.status === 'fulfilled') {
      const payload = getPayload(asesoriasResult.value);
      setAsesorias(Array.isArray(payload) ? payload : []);
    } else {
      setListError(
        getErrorMessage(
          asesoriasResult.reason,
          'No fue posible cargar las asesorías.',
        ),
      );
    }

    if (misAsesoriasResult.status === 'fulfilled') {
      const payload = getPayload(misAsesoriasResult.value);
      setMisAsesorias(Array.isArray(payload) ? payload : []);
      setMisAsesoriasError('');
    } else {
      setMisAsesoriasError(
        getErrorMessage(
          misAsesoriasResult.reason,
          'No fue posible cargar tus asesorías inscritas.',
        ),
      );
    }

    if (
      calificacionesResult.status === 'fulfilled' &&
      kardexResult.status === 'fulfilled'
    ) {
      try {
        const calificacionesPayload = getCalificaciones(
          calificacionesResult.value?.data,
        );
        const kardexResponse = kardexResult.value?.data;
        const kardexPayload = kardexResponse?.data ?? kardexResponse ?? {};
        const advisorResponse = await api.post('/extra/advisor', {
          calificaciones: calificacionesPayload,
          kardex: Array.isArray(kardexPayload?.kardex)
            ? kardexPayload.kardex
            : Array.isArray(kardexResponse?.kardex)
              ? kardexResponse.kardex
              : [],
        });
        setDiagnostico(advisorResponse.data);
      } catch (error) {
        setDiagnostico(null);
        setDiagnosticoError(
          getErrorMessage(
            error,
            'No fue posible generar el diagnóstico académico.',
          ),
        );
      }
    } else {
      const failedRequest =
        calificacionesResult.status === 'rejected'
          ? calificacionesResult.reason
          : kardexResult.reason;
      setDiagnostico(null);
      setDiagnosticoError(
        getErrorMessage(
          failedRequest,
          'No fue posible obtener los datos académicos para generar el diagnóstico.',
        ),
      );
    }

    if (showLoading) setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const runAction = async (actionId, operation, successMessage) => {
    setBusyAction(actionId);
    setActionMessage(null);
    try {
      await operation();
      setActionMessage({ type: 'success', text: successMessage });
      await fetchData();
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: getErrorMessage(error, 'No fue posible completar la operación.'),
      });
    } finally {
      setBusyAction('');
    }
  };

  const handleInscribir = (asesoria) =>
    runAction(
      `inscribir-${asesoria.id}`,
      () =>
        api.post(`/extra/inscribir/${asesoria.id}`, {
          alumno_id: userEmail,
        }),
      'Inscripción realizada correctamente.',
    );

  const handleCancelarInscripcion = (asesoria) => {
    if (!window.confirm('¿Estás seguro de cancelar tu inscripción a esta asesoría?')) {
      return;
    }
    return runAction(
      `cancelar-${asesoria.id}`,
      () =>
        api.delete(`/extra/inscribir/${asesoria.id}`, {
          params: { alumno_id: userEmail },
        }),
      'Inscripción cancelada correctamente.',
    );
  };

  const handleCrear = async (event) => {
    event.preventDefault();
    await runAction(
      'crear',
      async () => {
        await api.post('/extra/asesorias', {
          ...newForm,
          materia: newForm.materia.trim(),
          mentor: newForm.mentor.trim(),
          salon: newForm.salon.trim(),
          horario: newForm.horario.trim(),
          cupo_maximo: Number(newForm.cupo_maximo),
        });
        setNewForm(INITIAL_FORM);
      },
      'Asesoría registrada. Quedó pendiente de aprobación.',
    );
  };

  const handleEstado = (asesoria) => {
    const estado = asesoria.estado === 'Activa' ? 'Pendiente' : 'Activa';
    return runAction(
      `estado-${asesoria.id}`,
      () => api.patch(`/extra/asesorias/${asesoria.id}/estado`, { estado }),
      `Asesoría ${estado === 'Activa' ? 'activada' : 'pausada'}.`,
    );
  };

  const handleDelete = (asesoria) =>
    runAction(
      `eliminar-${asesoria.id}`,
      () => api.delete(`/extra/asesorias/${asesoria.id}`),
      'Asesoría eliminada.',
    );

  if (loading) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <Skeleton className="h-10 w-64 mb-8 bg-slate-800 rounded-lg" />
        <Skeleton className="h-96 w-full bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const activeAdvisories = asesorias.filter(
    (asesoria) => asesoria.estado === 'Activa',
  );
  const enrolledAdvisories = misAsesorias;
  const tabs = [
    { id: 'asesorias', label: 'Bolsa de Asesorías', Icon: Users },
    { id: 'diagnostico', label: 'Diagnóstico Inteligente', Icon: Activity },
    { id: 'admin', label: 'Gestión Administrativa', Icon: Settings },
  ];

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 text-slate-100">
      <div className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Centro de Asesorías y Seguimiento Académico
        </h1>
        <p className="text-slate-400 mt-1">
          LinceHub: Conectando talento y previniendo la deserción
        </p>
      </div>

      {actionMessage && (
        <div
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
          className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            actionMessage.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div
        className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto"
        role="tablist"
        aria-label="Secciones de LinceHub"
      >
        {tabs.map(({ id, label, Icon }) => {
          const selected = activeTab === id;
          const activeColor =
            id === 'asesorias'
              ? 'border-blue-500 text-blue-400'
              : id === 'diagnostico'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-amber-500 text-amber-400';
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                selected
                  ? activeColor
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'asesorias' && (
        <>
          <div
            className="flex w-max max-w-full gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 mb-6 overflow-x-auto"
            role="tablist"
            aria-label="Catálogo de asesorías"
          >
            <button
              type="button"
              role="tab"
              aria-selected={asesoriasSubTab === 'explorar'}
              onClick={() => setAsesoriasSubTab('explorar')}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                asesoriasSubTab === 'explorar'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark size={16} aria-hidden="true" /> Explorar Catálogo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={asesoriasSubTab === 'mis-asesorias'}
              onClick={() => setAsesoriasSubTab('mis-asesorias')}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                asesoriasSubTab === 'mis-asesorias'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 size={16} aria-hidden="true" /> Mis Asesorías (
              {enrolledAdvisories.length})
            </button>
          </div>
          {listError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {listError}
            </div>
          )}
          {asesoriasSubTab === 'mis-asesorias' && misAsesoriasError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {misAsesoriasError}
            </div>
          )}
          {asesoriasSubTab === 'explorar' && activeAdvisories.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
              No hay asesorías activas disponibles en este momento.
            </div>
          ) : asesoriasSubTab === 'explorar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeAdvisories.map((asesoria) => {
                const occupied = Number(asesoria.cupo_ocupado) || 0;
                const maximum = Number(asesoria.cupo_maximo) || 0;
                const full = maximum > 0 && occupied >= maximum;
                const isEnrolled = enrolledAdvisories.some(
                  (inscrita) => String(inscrita.id) === String(asesoria.id),
                );
                const isBusy = busyAction === `inscribir-${asesoria.id}`;

                return (
                  <article
                    key={asesoria.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded font-bold">
                          {asesoria.modalidad || 'Modalidad no indicada'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {occupied} / {maximum} inscritos
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1 leading-tight">
                        {asesoria.materia}
                      </h2>
                      <p className="text-sm text-slate-400 mb-4">
                        Mentor: {asesoria.mentor}
                      </p>
                      <div className="space-y-2">
                        <div className="bg-slate-950 p-3 rounded-lg text-sm flex items-center gap-3">
                          <Calendar
                            size={16}
                            className="text-slate-500 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-slate-300">
                            {asesoria.horario || 'Horario por definir'}
                          </span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg text-sm flex items-center gap-3">
                          <Info
                            size={16}
                            className="text-slate-500 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-slate-400">Aula:</span>
                          <span className="font-semibold text-slate-300">
                            {asesoria.salon || 'Por confirmar'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInscribir(asesoria)}
                      disabled={full || isEnrolled || Boolean(busyAction)}
                      className={`mt-6 w-full py-2.5 font-medium rounded-lg transition-colors ${
                        isEnrolled
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white'
                      }`}
                    >
                      {isBusy
                        ? 'Inscribiendo...'
                        : isEnrolled
                          ? 'Inscripción Confirmada'
                          : full
                            ? 'Cupo Lleno'
                            : 'Inscribirme Ahora'}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : enrolledAdvisories.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
              <CheckCircle2
                size={48}
                className="mx-auto mb-4 opacity-20"
                aria-hidden="true"
              />
              Aún no te has inscrito a ninguna asesoría.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {enrolledAdvisories.map((asesoria) => (
                <article
                  key={asesoria.id}
                  className="bg-emerald-900/10 border border-emerald-500/30 rounded-xl p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} aria-hidden="true" /> Confirmada
                      </span>
                      <span className="text-xs text-slate-400">
                        {asesoria.modalidad || 'Modalidad no indicada'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1 leading-tight">
                      {asesoria.materia}
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                      Mentor: {asesoria.mentor}
                    </p>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2 mb-4">
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <Calendar
                          size={16}
                          className="text-blue-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{asesoria.horario || 'Horario por definir'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <Info
                          size={16}
                          className="text-amber-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{asesoria.salon || 'Aula por confirmar'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => handleCancelarInscripcion(asesoria)}
                    className="mt-2 w-full py-2.5 bg-transparent border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 disabled:opacity-50 font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
                  >
                    <XCircle size={16} aria-hidden="true" />
                    {busyAction === `cancelar-${asesoria.id}`
                      ? 'Cancelando...'
                      : 'Cancelar Asistencia'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'diagnostico' && (
        <div className="space-y-6">
          {diagnosticoError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
            >
              {diagnosticoError}
            </div>
          )}
          {diagnostico && (
            <>
              <div
                className={`p-6 border rounded-xl flex items-start gap-4 ${
                  diagnostico.estadoGeneral === 'Óptimo'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <Activity
                  className={
                    diagnostico.estadoGeneral === 'Óptimo'
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                  }
                  size={32}
                  aria-hidden="true"
                />
                <div>
                  <h2
                    className={`text-xl font-bold ${
                      diagnostico.estadoGeneral === 'Óptimo'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {diagnostico.estadoGeneral}
                  </h2>
                  <p className="text-slate-300 mt-1">{diagnostico.mensaje}</p>
                  <p className="text-xs text-slate-500 mt-2 font-mono">
                    Motor Analítico: {diagnostico.source || 'Supabase Edge Function'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Créditos aprobados: {diagnostico.creditosAprobados ?? 0}
                  </p>
                </div>
              </div>

              {diagnostico.materiasEnRiesgo?.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold mb-4">
                    Materias con Atención Requerida
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {diagnostico.materiasEnRiesgo.map((riesgo, index) => (
                      <article
                        key={`${riesgo.clave || riesgo.materia || 'riesgo'}-${index}`}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-xl border-l-4 border-l-rose-500"
                      >
                        <div className="flex justify-between gap-3">
                          <h4 className="font-bold text-white mb-1">
                            {riesgo.materia || 'Materia sin nombre'}
                          </h4>
                          <span className="text-xs text-rose-300">
                            {riesgo.nivelRiesgo}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-3 font-mono">
                          {riesgo.clave || 'Sin clave'}
                        </p>
                        <div className="bg-slate-950 p-3 rounded-lg text-sm">
                          <p className="text-rose-400 font-medium">
                            {riesgo.unidadesReprobadas} unidades en riesgo
                          </p>
                          <p className="text-slate-400 mt-1">
                            {riesgo.recomendacion}
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('asesorias')}
                            className="mt-2 text-blue-400 hover:text-blue-300 text-xs font-bold underline"
                          >
                            Ver asesorías disponibles
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          {!diagnostico && !diagnosticoError && (
            <p className="text-slate-400">Aún no hay diagnóstico disponible.</p>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <>
          {listError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {listError}
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <section className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={18} className="text-emerald-500" />
                Nueva Asesoría
              </h2>
              <form onSubmit={handleCrear} className="space-y-4">
                <div>
                  <label
                    htmlFor="asesoria-materia"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Materia Objetivo
                  </label>
                  <input
                    id="asesoria-materia"
                    required
                    maxLength={150}
                    type="text"
                    value={newForm.materia}
                    onChange={(event) =>
                      setNewForm({ ...newForm, materia: event.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="asesoria-mentor"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Nombre del Mentor
                  </label>
                  <input
                    id="asesoria-mentor"
                    required
                    maxLength={150}
                    type="text"
                    value={newForm.mentor}
                    onChange={(event) =>
                      setNewForm({ ...newForm, mentor: event.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="asesoria-modalidad"
                      className="text-xs text-slate-400 mb-1 block"
                    >
                      Modalidad
                    </label>
                    <select
                      id="asesoria-modalidad"
                      value={newForm.modalidad}
                      onChange={(event) =>
                        setNewForm({ ...newForm, modalidad: event.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg"
                    >
                      <option>Presencial</option>
                      <option>En Línea</option>
                      <option>Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="asesoria-cupo"
                      className="text-xs text-slate-400 mb-1 block"
                    >
                      Cupo Máx
                    </label>
                    <input
                      id="asesoria-cupo"
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={newForm.cupo_maximo}
                      onChange={(event) =>
                        setNewForm({
                          ...newForm,
                          cupo_maximo: event.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="asesoria-horario"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Día y horario
                  </label>
                  <input
                    id="asesoria-horario"
                    required
                    maxLength={150}
                    type="text"
                    placeholder="Ej. Lunes y Miércoles 16:00 - 18:00"
                    value={newForm.horario}
                    onChange={(event) =>
                      setNewForm({ ...newForm, horario: event.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="asesoria-salon"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Aula / Plataforma
                  </label>
                  <input
                    id="asesoria-salon"
                    required
                    maxLength={100}
                    type="text"
                    value={newForm.salon}
                    onChange={(event) =>
                      setNewForm({ ...newForm, salon: event.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={Boolean(busyAction)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-medium mt-2"
                >
                  {busyAction === 'crear' ? 'Registrando...' : 'Registrar Programa'}
                </button>
              </form>
            </section>

            <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4">Materia</th>
                    <th scope="col" className="px-6 py-4">Mentor</th>
                    <th scope="col" className="px-6 py-4">Horario</th>
                    <th scope="col" className="px-6 py-4 text-center">
                      Inscritos
                    </th>
                    <th scope="col" className="px-6 py-4 text-center">Estado</th>
                    <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {asesorias.map((asesoria) => (
                    <tr key={asesoria.id}>
                      <td className="px-6 py-4 font-medium">
                        {asesoria.materia}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {asesoria.mentor}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {asesoria.horario || 'Por definir'}
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        {asesoria.cupo_ocupado}/{asesoria.cupo_maximo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            asesoria.estado === 'Activa'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {asesoria.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleEstado(asesoria)}
                            className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-slate-300 transition-colors"
                          >
                            {asesoria.estado === 'Activa' ? 'Pausar' : 'Aprobar'}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleDelete(asesoria)}
                            className="text-xs px-3 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-50 rounded transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {asesorias.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-slate-400"
                      >
                        No hay asesorías registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
