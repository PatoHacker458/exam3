import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Info,
  Plus,
  Settings,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';

const DIAS_OPCIONES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const INITIAL_FORM = {
  materia: '',
  mentor: '',
  modalidad: 'Presencial',
  salon: '',
  dias: [],
  hora_inicio: '14:00',
  hora_fin: '16:00',
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
  const [editingId, setEditingId] = useState(null);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newForm.dias.length === 0) {
      setActionMessage({
        type: 'error',
        text: 'Selecciona al menos un día para la asesoría.',
      });
      return;
    }
    if (newForm.hora_inicio >= newForm.hora_fin) {
      setActionMessage({
        type: 'error',
        text: 'La hora de fin debe ser posterior a la hora de inicio.',
      });
      return;
    }

    await runAction(
      editingId ? `actualizar-${editingId}` : 'crear',
      async () => {
        const asesoriaData = {
          ...newForm,
          materia: newForm.materia.trim(),
          mentor: newForm.mentor.trim(),
          salon: newForm.salon.trim(),
          cupo_maximo: Number(newForm.cupo_maximo),
        };
        if (editingId) {
          await api.put(`/extra/asesorias/${editingId}`, asesoriaData);
        } else {
          await api.post('/extra/asesorias', asesoriaData);
        }
        setEditingId(null);
        setNewForm(INITIAL_FORM);
      },
      editingId
        ? 'Asesoría actualizada correctamente.'
        : 'Asesoría registrada. Quedó pendiente de aprobación.',
    );
  };

  const toggleDia = (dia) => {
    setNewForm((current) => ({
      ...current,
      dias: current.dias.includes(dia)
        ? current.dias.filter((selected) => selected !== dia)
        : [...current.dias, dia],
    }));
  };

  const handleEdit = (asesoria) => {
    const storedDays = Array.isArray(asesoria.dias)
      ? asesoria.dias
      : typeof asesoria.dias === 'string'
        ? asesoria.dias.split(',').map((dia) => dia.trim()).filter(Boolean)
        : [];
    setEditingId(asesoria.id);
    setNewForm({
      materia: asesoria.materia || '',
      mentor: asesoria.mentor || '',
      modalidad: asesoria.modalidad || 'Presencial',
      salon: asesoria.salon || '',
      dias: storedDays,
      hora_inicio: asesoria.hora_inicio || '14:00',
      hora_fin: asesoria.hora_fin || '16:00',
      cupo_maximo: asesoria.cupo_maximo,
    });
    setActionMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewForm(INITIAL_FORM);
  };

  const handleEstado = (asesoria) => {
    const estado = asesoria.estado === 'Activa' ? 'Pendiente' : 'Activa';
    return runAction(
      `estado-${asesoria.id}`,
      () => api.patch(`/extra/asesorias/${asesoria.id}/estado`, { estado }),
      `Asesoría ${estado === 'Activa' ? 'activada' : 'pausada'}.`,
    );
  };

  const handleDelete = (asesoria) => {
    if (
      !window.confirm(
        '¿Eliminar definitivamente esta asesoría? Esta acción borrará a todos los inscritos.',
      )
    ) {
      return;
    }
    return runAction(
      `eliminar-${asesoria.id}`,
      async () => {
        await api.delete(`/extra/asesorias/${asesoria.id}`);
        if (String(editingId) === String(asesoria.id)) handleCancelEdit();
      },
      'Asesoría eliminada.',
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-8 min-h-screen bg-[#e6e6e6]">
        <Skeleton className="h-10 w-64 mb-8 bg-zinc-300 rounded-lg" />
        <Skeleton className="h-96 w-full bg-zinc-300 rounded-xl" />
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
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-8 text-zinc-900 bg-[#e6e6e6] min-h-screen">
      <div className="mb-8 border-b border-zinc-300 pb-4">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Centro de Asesorías y Seguimiento Académico
        </h1>
        <p className="text-zinc-600 mt-1">
          LinceHub: Conectando talento y previniendo la deserción
        </p>
      </div>

      {actionMessage && (
        <div
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
          className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            actionMessage.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-700'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div
        className="flex gap-2 mb-6 border-b border-zinc-300 overflow-x-auto"
        role="tablist"
        aria-label="Secciones de LinceHub"
      >
        {tabs.map(({ id, label, Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                selected
                  ? 'border-emerald-700 text-emerald-800 bg-zinc-100 rounded-t-lg'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
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
            className="flex w-max max-w-full gap-1 rounded-lg border border-zinc-300 bg-zinc-300/70 p-1 mb-6 overflow-x-auto"
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
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-900'
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
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <CheckCircle2 size={16} aria-hidden="true" /> Mis Asesorías (
              {enrolledAdvisories.length})
            </button>
          </div>

          {listError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {listError}
            </div>
          )}
          {asesoriasSubTab === 'mis-asesorias' && misAsesoriasError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {misAsesoriasError}
            </div>
          )}

          {asesoriasSubTab === 'explorar' && activeAdvisories.length === 0 ? (
            <div className="rounded-xl border border-zinc-300 bg-zinc-100 p-10 text-center text-zinc-600">
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
                    className="bg-zinc-100 border border-zinc-300 rounded-xl p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded font-semibold">
                          {asesoria.modalidad || 'Modalidad no indicada'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono font-medium">
                          {occupied} / {maximum} inscritos
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-zinc-900 mb-1 leading-tight">
                        {asesoria.materia}
                      </h2>
                      <p className="text-sm text-zinc-600 mb-4">
                        Mentor: <span className="text-zinc-800 font-medium">{asesoria.mentor}</span>
                      </p>
                      <div className="space-y-2 mb-4 bg-zinc-200/70 p-3 rounded-lg border border-zinc-300">
                        <div className="flex items-center gap-3 text-sm text-zinc-700">
                          <Calendar
                            size={16}
                            className="text-zinc-500 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {asesoria.horario || 'Horario por definir'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-700">
                          <Info
                            size={16}
                            className="text-zinc-500 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Aula: <span className="font-semibold text-zinc-900">{asesoria.salon || 'Por confirmar'}</span></span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInscribir(asesoria)}
                      disabled={full || isEnrolled || Boolean(busyAction)}
                      className={`mt-4 w-full py-2.5 font-semibold rounded-lg transition-colors flex justify-center items-center gap-2 
                        ${isEnrolled 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-400' 
                          : full 
                            ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-300' 
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow'}`}
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
            <div className="rounded-xl border border-zinc-300 bg-zinc-100 p-10 text-center text-zinc-600">
              <CheckCircle2
                size={48}
                className="mx-auto mb-4 opacity-30 text-zinc-600"
                aria-hidden="true"
              />
              <p className="font-medium text-zinc-700">Aún no te has inscrito a ninguna asesoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {enrolledAdvisories.map((asesoria) => (
                <article
                  key={asesoria.id}
                  className="bg-zinc-100 border-2 border-emerald-500/50 rounded-xl p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} aria-hidden="true" /> Confirmada
                      </span>
                      <span className="text-xs text-zinc-500">
                        {asesoria.modalidad || 'Modalidad no indicada'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-zinc-900 mb-1 leading-tight">
                      {asesoria.materia}
                    </h2>
                    <p className="text-sm text-zinc-600 mb-4">
                      Mentor: <span className="text-zinc-800 font-medium">{asesoria.mentor}</span>
                    </p>
                    <div className="bg-zinc-200/80 p-3 rounded-lg border border-zinc-300 space-y-2 mb-4">
                      <div className="flex items-center gap-3 text-sm text-zinc-800">
                        <Calendar
                          size={16}
                          className="text-emerald-700 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{asesoria.horario || 'Horario por definir'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-800">
                        <Info
                          size={16}
                          className="text-amber-700 shrink-0"
                          aria-hidden="true"
                        />
                        <span><span className="font-semibold text-zinc-900">{asesoria.salon || 'Aula por confirmar'}</span></span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => handleCancelarInscripcion(asesoria)}
                    className="mt-2 w-full py-2.5 bg-zinc-200 border border-rose-400 text-rose-700 hover:bg-rose-100 disabled:opacity-50 font-semibold rounded-lg transition-colors flex justify-center items-center gap-2"
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
              className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700"
            >
              {diagnosticoError}
            </div>
          )}
          {diagnostico && (
            <>
              <div
                className={`p-6 border rounded-xl flex items-start gap-4 ${
                  diagnostico.estadoGeneral === 'Óptimo'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <Activity
                  className={
                    diagnostico.estadoGeneral === 'Óptimo'
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }
                  size={32}
                  aria-hidden="true"
                />
                <div>
                  <h2
                    className={`text-xl font-bold ${
                      diagnostico.estadoGeneral === 'Óptimo'
                        ? 'text-emerald-800'
                        : 'text-rose-800'
                    }`}
                  >
                    {diagnostico.estadoGeneral}
                  </h2>
                  <p className="text-zinc-700 mt-1">{diagnostico.mensaje}</p>
                  <p className="text-xs text-zinc-500 mt-2 font-mono">
                    Motor Analítico: {diagnostico.source || 'Supabase Edge Function'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Créditos aprobados: {diagnostico.creditosAprobados ?? 0}
                  </p>
                </div>
              </div>

              {diagnostico.materiasEnRiesgo?.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-zinc-900 mb-4">
                    Materias con Atención Requerida
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {diagnostico.materiasEnRiesgo.map((riesgo, index) => (
                      <article
                        key={`${riesgo.clave || riesgo.materia || 'riesgo'}-${index}`}
                        className="bg-zinc-100 border border-zinc-300 p-5 rounded-xl border-l-4 border-l-rose-600 shadow-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <h4 className="font-bold text-zinc-900 mb-1">
                            {riesgo.materia || 'Materia sin nombre'}
                          </h4>
                          <span className="text-xs text-rose-700">
                            {riesgo.nivelRiesgo}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 mb-3 font-mono">
                          {riesgo.clave || 'Sin clave'}
                        </p>
                        <div className="flex justify-between items-center bg-zinc-200/80 p-3 rounded-lg text-sm border border-zinc-300">
                          <span className="text-rose-700 font-bold">
                            {riesgo.unidadesReprobadas} unidades en riesgo
                          </span>
                          <button
                            type="button"
                            onClick={() => { setActiveTab('asesorias'); setAsesoriasSubTab('explorar'); }}
                            className="text-emerald-800 hover:text-emerald-900 text-xs font-bold underline"
                          >
                            {riesgo.recomendacion}
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
            <p className="text-zinc-600">Aún no hay diagnóstico disponible.</p>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <>
          {listError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {listError}
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <section
              className={`xl:col-span-1 border rounded-xl p-6 h-fit transition-colors ${
                editingId
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-zinc-100 border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Edit2 size={18} className="text-blue-700" />
                      Editar Asesoría
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="text-emerald-700" />
                      Nueva Asesoría
                    </>
                  )}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={handleCancelEdit}
                    className="text-zinc-600 hover:text-zinc-900 disabled:opacity-50 flex items-center gap-1 text-xs"
                  >
                    <X size={14} aria-hidden="true" /> Cancelar
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="asesoria-materia"
                    className="text-xs font-medium text-zinc-700 mb-1 block"
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
                    className="w-full px-4 py-2 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="asesoria-mentor"
                    className="text-xs font-medium text-zinc-700 mb-1 block"
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
                    className="w-full px-4 py-2 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-700 mb-1.5 block">
                    Días de impartición
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {DIAS_OPCIONES.map((dia) => {
                      const selected = newForm.dias.includes(dia);
                      return (
                        <button
                          type="button"
                          key={dia}
                          aria-pressed={selected}
                          onClick={() => toggleDia(dia)}
                          className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            selected
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-zinc-200 text-zinc-700 border-zinc-300 hover:border-zinc-400'
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="asesoria-hora-inicio"
                      className="text-xs font-medium text-zinc-700 mb-1 block"
                    >
                      Hora de inicio
                    </label>
                    <div className="relative">
                      <Clock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="asesoria-hora-inicio"
                        required
                        type="time"
                        value={newForm.hora_inicio}
                        onChange={(event) =>
                          setNewForm({
                            ...newForm,
                            hora_inicio: event.target.value,
                          })
                        }
                        className="w-full px-4 py-2 pl-9 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="asesoria-hora-fin"
                      className="text-xs font-medium text-zinc-700 mb-1 block"
                    >
                      Hora de fin
                    </label>
                    <div className="relative">
                      <Clock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="asesoria-hora-fin"
                        required
                        type="time"
                        value={newForm.hora_fin}
                        onChange={(event) =>
                          setNewForm({
                            ...newForm,
                            hora_fin: event.target.value,
                          })
                        }
                        className="w-full px-4 py-2 pl-9 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="asesoria-modalidad"
                      className="text-xs font-medium text-zinc-700 mb-1 block"
                    >
                      Modalidad
                    </label>
                    <select
                      id="asesoria-modalidad"
                      value={newForm.modalidad}
                      onChange={(event) =>
                        setNewForm({ ...newForm, modalidad: event.target.value })
                      }
                      className="w-full px-4 py-2 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg"
                    >
                      <option>Presencial</option>
                      <option>En Línea</option>
                      <option>Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="asesoria-cupo"
                      className="text-xs font-medium text-zinc-700 mb-1 block"
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
                      className="w-full px-4 py-2 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="asesoria-salon"
                    className="text-xs font-medium text-zinc-700 mb-1 block"
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
                    className="w-full px-4 py-2 bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={Boolean(busyAction)}
                  className={`w-full py-2.5 disabled:opacity-60 text-white rounded-lg font-semibold mt-2 transition-colors ${
                    editingId
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {busyAction === 'crear'
                    ? 'Registrando...'
                    : editingId && busyAction === `actualizar-${editingId}`
                      ? 'Guardando...'
                      : editingId
                        ? 'Guardar Cambios'
                        : 'Registrar Programa'}
                </button>
              </form>
            </section>

            <section className="xl:col-span-2 bg-zinc-100 border border-zinc-300 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-200/90 text-zinc-700 border-b border-zinc-300">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-bold">Materia</th>
                    <th scope="col" className="px-6 py-4 font-bold">Mentor</th>
                    <th scope="col" className="px-6 py-4 font-bold">Horario</th>
                    <th scope="col" className="px-6 py-4 text-center font-bold">
                      Cupo
                    </th>
                    <th scope="col" className="px-6 py-4 text-center font-bold">Estado</th>
                    <th scope="col" className="px-6 py-4 text-right font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300">
                  {asesorias.map((asesoria) => (
                    <tr
                      key={asesoria.id}
                      className={
                        String(editingId) === String(asesoria.id)
                          ? 'bg-blue-50'
                          : 'hover:bg-zinc-200/50'
                      }
                    >
                      <td className="px-6 py-4 font-semibold text-zinc-900">
                        {asesoria.materia}
                      </td>
                      <td className="px-6 py-4 text-zinc-600">
                        {asesoria.mentor}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 text-xs font-mono">
                        {asesoria.horario || 'Por definir'}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium">
                        {asesoria.cupo_ocupado}/{asesoria.cupo_maximo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer select-none transition-colors ${
                            asesoria.estado === 'Activa'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                          onClick={() => handleEstado(asesoria)}
                          title="Clic para cambiar estado"
                        >
                          {asesoria.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleEdit(asesoria)}
                            className="text-xs px-3 py-1 bg-zinc-200 hover:bg-zinc-300 disabled:opacity-50 border border-zinc-300 rounded text-zinc-800 font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleDelete(asesoria)}
                            className="text-xs px-3 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50 border border-rose-300 rounded font-medium transition-colors"
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
                        className="px-6 py-8 text-center text-zinc-600"
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