import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Award,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Hash,
  Building2,
  ChevronRight,
  TrendingUp,
  CheckCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth, maskInstitutionalEmail } from '../context/AuthContext.jsx';
import { DashboardSkeleton } from '../components/ui/Skeleton.jsx';
import {
  extractText,
  pickText,
  unwrapSiiPayload,
  normalizeSiiPhoto,
} from '../utils/siiParser.js';

/**
 * Mapea con precisión la estructura real de GET /api/movil/estudiante del SII ITC:
 */
function normalizeStudentProfile(rawPayload, fallbackEmail) {
  const payload = unwrapSiiPayload(rawPayload);
  const student =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload.estudiante || payload.alumno || payload
      : {};

  const fullName =
    pickText(student, [
      'persona',
      'nombre_completo',
      'nombreCompleto',
      'nombre_alumno',
      'nombre',
    ]) || 'Estudiante TecNM Celaya';

  const numeroControl =
    pickText(student, [
      'numero_control',
      'no_control',
      'no_de_control',
      'num_control',
      'matricula',
    ]) || (fallbackEmail ? fallbackEmail.split('@')[0].toUpperCase() : 'S/N');

  const email =
    pickText(student, ['email', 'correo', 'correo_institucional']) ||
    fallbackEmail ||
    'estudiante@celaya.tecnm.mx';

  const carrera =
    pickText(student, ['nombre_carrera', 'carrera', 'especialidad', 'programa']) ||
    'Ingeniería · TecNM Campus Celaya';

  const semestreRaw = pickText(student, ['semestre', 'semestre_actual'], '—');
  const semestreNum = !Number.isNaN(Number(semestreRaw)) ? Number(semestreRaw) : null;

  const toNumberOrNull = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  };

  const promedioPonderado = toNumberOrNull(
    student.promedio_ponderado ?? student.promedio
  );
  const promedioAritmetico = toNumberOrNull(student.promedio_aritmetico);

  const creditosAcumulados = toNumberOrNull(
    student.creditos_acumulados ?? student.creditos
  );
  const creditosComplementarios =
    toNumberOrNull(student.creditos_complementarios) ?? 0;

  const porcentajeAvance = toNumberOrNull(student.porcentaje_avance) ?? 0;
  const porcentajeAvanceCursando =
    toNumberOrNull(
      student.percentaje_avance_cursando ?? student.porcentaje_avance_cursando
    ) ?? 0;

  const materiasCursadas = toNumberOrNull(student.materias_cursadas) ?? 0;
  const materiasAprobadas = toNumberOrNull(student.materias_aprobadas) ?? 0;
  const materiasReprobadas = toNumberOrNull(student.materias_reprobadas) ?? 0;
  const materiasNoAcreditadas =
    toNumberOrNull(student.num_mat_rep_no_acreditadas) ?? 0;

  const repPrimera = toNumberOrNull(student.num_materias_rep_primera) ?? 0;
  const repSegunda = toNumberOrNull(student.num_materias_rep_segunda) ?? 0;

  const fotoDataUrl = normalizeSiiPhoto(
    student.foto || student.url_foto || student.imagen
  );

  const structuredDetails = [
    {
      key: 'numero_control',
      label: 'Número de Control',
      value: numeroControl,
      mono: true,
    },
    {
      key: 'persona',
      label: 'Nombre del Estudiante',
      value: fullName,
    },
    {
      key: 'email',
      label: 'Correo Institucional',
      value: email,
      isSensitive: true,
      mono: true,
    },
    {
      key: 'semestre',
      label: 'Semestre Actual',
      value: semestreNum !== null ? `${semestreNum}° Semestre` : String(semestreRaw),
    },
    {
      key: 'promedio_ponderado',
      label: 'Promedio Ponderado',
      value: promedioPonderado !== null ? promedioPonderado.toFixed(2) : '—',
      mono: true,
    },
    {
      key: 'promedio_aritmetico',
      label: 'Promedio Aritmético',
      value: promedioAritmetico !== null ? promedioAritmetico.toFixed(2) : '—',
      mono: true,
    },
    {
      key: 'creditos_acumulados',
      label: 'Créditos Acumulados',
      value: creditosAcumulados !== null ? String(creditosAcumulados) : '—',
      mono: true,
    },
    {
      key: 'creditos_complementarios',
      label: 'Créditos Complementarios',
      value: String(creditosComplementarios),
      mono: true,
    },
    {
      key: 'porcentaje_avance',
      label: 'Avance Reticular',
      value: `${porcentajeAvance}%`,
      mono: true,
    },
    {
      key: 'percentaje_avance_cursando',
      label: 'Avance Cursando',
      value: `${porcentajeAvanceCursando}%`,
      mono: true,
    },
    {
      key: 'materias_cursadas',
      label: 'Asignaturas Cursadas',
      value: String(materiasCursadas),
      mono: true,
    },
    {
      key: 'materias_aprobadas',
      label: 'Asignaturas Aprobadas',
      value: String(materiasAprobadas),
      mono: true,
    },
    {
      key: 'materias_reprobadas',
      label: 'Asignaturas Reprobadas',
      value: String(materiasReprobadas),
      mono: true,
    },
    {
      key: 'num_mat_rep_no_acreditadas',
      label: 'No Acreditadas en Repetición',
      value: String(materiasNoAcreditadas),
      mono: true,
    },
    {
      key: 'num_materias_rep_primera',
      label: 'Repetición (1ra Oportunidad)',
      value: String(repPrimera),
      mono: true,
    },
    {
      key: 'num_materias_rep_segunda',
      label: 'Especial / 2da Repetición',
      value: String(repSegunda),
      mono: true,
    },
  ];

  return {
    fullName,
    numeroControl,
    email,
    carrera,
    semestreDisplay: semestreNum !== null ? `${semestreNum}°` : String(semestreRaw),
    semestreNum,
    promedioPonderado,
    promedioPonderadoDisplay:
      promedioPonderado !== null ? promedioPonderado.toFixed(2) : '—',
    promedioAritmetico,
    promedioAritmeticoDisplay:
      promedioAritmetico !== null ? promedioAritmetico.toFixed(2) : '—',
    creditosAcumulados,
    creditosComplementarios,
    porcentajeAvance,
    porcentajeAvanceCursando,
    materiasCursadas,
    materiasAprobadas,
    materiasReprobadas,
    materiasNoAcreditadas,
    foto: fotoDataUrl,
    structuredDetails,
  };
}

export default function DashboardPage() {
  const { userEmail, logout } = useAuth();
  const [rawStudentData, setRawStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSensitivePii, setShowSensitivePii] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const fetchStudentProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    setPhotoLoadError(false);

    try {
      const response = await api.get('/sii/estudiante');
      setRawStudentData(response.data);
    } catch (error) {
      const status = error?.response?.status;
      const serverMsg = extractText(error?.response?.data?.message, '');

      if (status === 401 || status === 403) {
        setErrorMsg(
          serverMsg || 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
        );
      } else {
        setErrorMsg(
          serverMsg ||
            'No se pudo obtener la información del expediente estudiantil en este momento.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Expediente Estudiantil</h1>
          <p className="text-sm text-zinc-600">
            Cargando información académica del estudiante...
          </p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-2xl bg-zinc-100 border border-rose-300 p-8 text-center max-w-2xl mx-auto my-8 space-y-5 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-rose-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900">
            No se pudo cargar el expediente
          </h2>
          <p className="text-sm text-zinc-600 leading-relaxed">{errorMsg}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={fetchStudentProfile}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 border border-zinc-300 text-zinc-800 font-semibold text-sm transition-colors cursor-pointer"
          >
            <span>Volver al inicio de sesión</span>
          </button>
        </div>
      </div>
    );
  }

  const profile = normalizeStudentProfile(rawStudentData, userEmail);

  const approvalRatePct =
    profile.materiasCursadas > 0
      ? Math.round((profile.materiasAprobadas / profile.materiasCursadas) * 100)
      : 100;

  const averageColorClass =
    profile.promedioPonderado === null
      ? 'text-emerald-700'
      : profile.promedioPonderado >= 80
      ? 'text-emerald-700'
      : profile.promedioPonderado >= 70
      ? 'text-amber-700'
      : 'text-rose-700';

  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6 text-zinc-900 bg-[#e6e6e6] min-h-screen p-4 sm:p-6 lg:p-8 rounded-xl">
      {/* Encabezado Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Expediente Estudiantil
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-0.5 tracking-tight">
            {profile.fullName}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowSensitivePii((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-sm"
          >
            {showSensitivePii ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Ocultar correo completo</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mostrar correo completo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={fetchStudentProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Principal de Perfil con Fotografía Base64 Real */}
      <section className="rounded-2xl bg-white border border-zinc-300 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {profile.foto && !photoLoadError ? (
              <img
                src={profile.foto}
                alt={`Fotografía de ${profile.fullName}`}
                onError={() => setPhotoLoadError(true)}
                className="w-24 h-28 rounded-2xl object-cover border-2 border-emerald-200 shadow-sm shrink-0 bg-zinc-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl font-extrabold text-emerald-700 shadow-sm border border-emerald-200 shrink-0">
                {initials || <User className="w-9 h-9" />}
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ESTUDIANTE INSCRITO
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300">
                  <Hash className="w-3 h-3 text-emerald-600" />
                  {profile.numeroControl}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  {profile.semestreDisplay} Semestre
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                {profile.fullName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-zinc-600 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {profile.carrera}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-zinc-600">
                  <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                  {showSensitivePii
                    ? profile.email
                    : maskInstitutionalEmail(profile.email)}
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de Avance Reticular en el Banner */}
          <div className="w-full lg:w-72 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 font-bold">Avance Reticular</span>
              <span className="font-mono font-bold text-emerald-700">
                {profile.porcentajeAvance}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden border border-zinc-300">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, profile.porcentajeAvance))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium pt-0.5">
              <span>Avance cursando: {profile.porcentajeAvanceCursando}%</span>
              <span>{profile.creditosAcumulados ?? 0} créditos</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Tarjetas de Indicadores Clave (Soporte Ultrawide 5 Columnas) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* KPI 1: Promedio Ponderado y Aritmético */}
        <div className="rounded-2xl bg-white border border-zinc-300 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Promedio Ponderado
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <p className={`text-2xl font-extrabold font-mono ${averageColorClass}`}>
              {profile.promedioPonderadoDisplay}
            </p>
            <span className="text-xs text-zinc-500 font-medium">/ 100</span>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Promedio aritmético:{' '}
            <span className="text-zinc-800 font-mono font-bold">
              {profile.promedioAritmeticoDisplay}
            </span>
          </p>
        </div>

        {/* KPI 2: Créditos Acumulados */}
        <div className="rounded-2xl bg-white border border-zinc-300 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Créditos Acumulados
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold font-mono text-zinc-900">
              {profile.creditosAcumulados ?? '—'}
            </p>
            <span className="text-xs font-bold text-purple-700">
              ({profile.porcentajeAvance}% avance)
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Complementarios:{' '}
            <span className="text-zinc-800 font-mono font-bold">
              {profile.creditosComplementarios}
            </span>
          </p>
        </div>

        {/* KPI 3: Semestre y Avance Cursando */}
        <div className="rounded-2xl bg-white border border-zinc-300 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Semestre Inscrito
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              {profile.semestreDisplay} Semestre
            </p>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Avance cursando:{' '}
            <span className="text-sky-700 font-mono font-bold">
              {profile.porcentajeAvanceCursando}%
            </span>
          </p>
        </div>

        {/* KPI 4: Materias Aprobadas vs Cursadas */}
        <div className="rounded-2xl bg-white border border-zinc-300 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Materias Aprobadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <CheckCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold font-mono text-zinc-900">
              {profile.materiasAprobadas}
            </p>
            <span className="text-xs text-zinc-500 font-medium">
              / {profile.materiasCursadas} cursadas
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Efectividad académica:{' '}
            <span className="text-emerald-700 font-mono font-bold">
              {approvalRatePct}%
            </span>
          </p>
        </div>

        {/* KPI 5: Materias Reprobadas / No Acreditadas */}
        <div className="rounded-2xl bg-white border border-zinc-300 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Índice de Regularidad
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold font-mono text-zinc-900">
              {profile.materiasReprobadas}
            </p>
            <span className="text-xs text-zinc-500 font-medium">
              {profile.materiasReprobadas === 1 ? 'reprobada' : 'reprobadas'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            No acreditadas:{' '}
            <span className="text-zinc-800 font-mono font-bold">
              {profile.materiasNoAcreditadas}
            </span>
          </p>
        </div>
      </section>

      {/* Panel Inferior Adaptado a Ultrawide */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <section className="xl:col-span-3 rounded-2xl bg-white border border-zinc-300 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-zinc-900">
              Resumen de Trayectoria Académica
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
            {profile.structuredDetails.map((attr) => {
              const displayVal =
                attr.isSensitive && !showSensitivePii
                  ? maskInstitutionalEmail(attr.value)
                  : attr.value;

              return (
                <div
                  key={attr.key}
                  className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between shadow-sm"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    {attr.label}
                  </span>
                  <span
                    className={`text-sm font-bold text-zinc-800 mt-1 break-words ${
                      attr.mono ? 'font-mono' : ''
                    }`}
                  >
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Accesos Directos */}
        <section className="rounded-2xl bg-white border border-zinc-300 p-6 flex flex-col justify-between space-y-5 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">
              Módulos de Consulta
            </h3>
            <p className="text-xs text-zinc-500 font-medium mb-4">
              Accede a tus calificaciones del semestre, kárdex y horario
            </p>

            <div className="space-y-3">
              <Link
                to="/calificaciones"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 transition-all group shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-800 group-hover:text-emerald-700">
                    Calificaciones del Periodo
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Unidades evaluadas y promedios
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 shrink-0" />
              </Link>

              <Link
                to="/kardex"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 transition-all group shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-800 group-hover:text-emerald-700">
                    Kardex Académico
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Historial completo de asignaturas
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 shrink-0" />
              </Link>

              <Link
                to="/horarios"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 transition-all group shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-800 group-hover:text-emerald-700">
                    Horario de Clases
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Distribución semanal de asignaturas
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 shrink-0" />
              </Link>

              <Link
                to="/lince-hub"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 transition-all group shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-800 group-hover:text-emerald-700">
                    Comunidad / Asesorías
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Apoyo académico y recursos
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 shrink-0" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}