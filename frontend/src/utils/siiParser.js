import { CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';

const WRAPPER_META_KEYS = new Set([
  'responseCodeTxt',
  'status',
  'flag',
  'ok',
  'code',
  'timestamp',
]);

const DEFAULT_TEXT_KEYS = [
  'descripcion_periodo',
  'nombre_materia',
  'nombre_completo',
  'nombreCompleto',
  'persona',
  'nombre_corto',
  'nombre_abreviado_materia',
  'nombre_abreviado',
  'materia_nombre',
  'nombre_asignatura',
  'asignatura',
  'identificacion_larga',
  'identificacion_corta',
  'nombre_periodo',
  'periodo_descripcion',
  'nombre_carrera',
  'nombre_especialidad',
  'nombre_docente',
  'nombre_profesor',
  'nombre',
  'nombres',
  'descripcion',
  'materia',
  'carrera',
  'especialidad',
  'docente',
  'profesor',
  'catedratico',
  'clave_materia',
  'cve_materia',
  'clave_asignatura',
  'clave',
  'codigo',
  'letra_grupo',
  'cve_grupo',
  'grupo',
  'letra',
  'clave_periodo',
  'periodo',
  'ciclo',
  'semestre',
  'estatus',
  'situacion',
  'aula',
  'salon',
  'valor',
  'texto',
  'label',
  'title',
];

/**
 * Extrae texto legible de cualquier valor (string, number, array u objeto anidado).
 * Garantiza que JAMÁS se devuelva "[object Object]".
 */
export function extractText(val, fallback = '', preferredKeys = [], depth = 0) {
  if (val === null || val === undefined || depth > 4) {
    return fallback;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === '[object Object]' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return fallback;
    }
    return trimmed;
  }

  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }

  if (Array.isArray(val)) {
    const parts = val
      .map((item) => extractText(item, '', preferredKeys, depth + 1))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }

  if (typeof val === 'object') {
    // 1. Si el objeto representa una persona con nombre y apellidos separados
    const rawNombre =
      val.nombre_completo || val.nombreCompleto || val.persona || val.nombres || val.nombre;
    const rawPaterno =
      val.apellido_paterno || val.ap_paterno || val.primer_apellido || val.paterno;
    const rawMaterno =
      val.apellido_materno || val.ap_materno || val.segundo_apellido || val.materno;

    if (
      typeof rawNombre === 'string' &&
      (typeof rawPaterno === 'string' || typeof rawMaterno === 'string')
    ) {
      const n = rawNombre.trim();
      const p = typeof rawPaterno === 'string' ? rawPaterno.trim() : '';
      const m = typeof rawMaterno === 'string' ? rawMaterno.trim() : '';
      if (p && !n.toLowerCase().includes(p.toLowerCase())) {
        return [n, p, m].filter(Boolean).join(' ');
      }
    }

    // 2. Buscar en las llaves preferidas y luego en las llaves institucionales conocidas
    const searchKeys = [...preferredKeys, ...DEFAULT_TEXT_KEYS];
    for (const key of searchKeys) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const candidate = val[key];
        if (candidate !== null && candidate !== undefined && candidate !== val) {
          const extracted = extractText(candidate, '', preferredKeys, depth + 1);
          if (extracted && extracted !== '[object Object]') {
            return extracted;
          }
        }
      }
    }

    // 3. Buscar cualquier propiedad de tipo string no vacía dentro del objeto
    for (const [key, propVal] of Object.entries(val)) {
      if (WRAPPER_META_KEYS.has(key) || key === 'foto') continue;
      if (typeof propVal === 'string') {
        const clean = propVal.trim();
        if (clean && clean !== '[object Object]') {
          return clean;
        }
      }
    }

    // 4. Buscar cualquier número o valor primitivo en el objeto
    for (const [key, propVal] of Object.entries(val)) {
      if (WRAPPER_META_KEYS.has(key) || key === 'foto') continue;
      if (typeof propVal === 'number') {
        return String(propVal);
      }
      if (propVal && typeof propVal === 'object') {
        const nested = extractText(propVal, '', preferredKeys, depth + 1);
        if (nested && nested !== '[object Object]') {
          return nested;
        }
      }
    }
  }

  return fallback;
}

/**
 * Busca la primera llave existente en un objeto y extrae su valor como texto seguro.
 */
export function pickText(obj, keys, fallback = '', preferredSubKeys = []) {
  if (!obj || typeof obj !== 'object') return fallback;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const text = extractText(obj[key], '', preferredSubKeys);
      if (text && text !== '[object Object]') {
        return text;
      }
    }
  }
  return fallback;
}

/**
 * Desempaqueta la envoltura del SII ITC:
 * Soporta tanto `{ code: 200, message: "...", flag: true, data: ... }`
 * como `{ responseCodeTxt: "200 OK", message: { ... }, status: 200, data: 200 }`.
 */
export function unwrapSiiPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  if (Array.isArray(raw)) return raw;

  if (raw.data !== undefined && raw.data !== null && typeof raw.data === 'object') {
    return raw.data;
  }

  if (raw.message !== undefined && raw.message !== null && typeof raw.message === 'object') {
    return raw.message;
  }

  return raw;
}

/**
 * Normaliza una fotografía procedente del SII ITC (soporta Base64 crudo sin prefijo,
 * con saltos de línea `\n`, Data URLs completas o URLs HTTP).
 */
export function normalizeSiiPhoto(rawFoto) {
  if (!rawFoto || typeof rawFoto !== 'string') return null;
  const trimmed = rawFoto.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // En el SII ITC la foto viene como JPEG en Base64 crudo ("/9j/4AAQSkZJRg...") con saltos de línea
  const cleanBase64 = trimmed.replace(/\s+/g, '');
  if (cleanBase64.length > 60) {
    const mime = cleanBase64.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${cleanBase64}`;
  }

  return null;
}

/**
 * Determina si un objeto representa una Materia/Asignatura individual
 * (incluyendo el typo real del SII ITC: `calificaiones`).
 */
function isSubjectEntry(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  const subjectIndicators = [
    'materia',
    'calificaiones', // Typo real del endpoint /api/movil/estudiante/calificaciones del SII ITC
    'nombre_materia',
    'nombreMateria',
    'asignatura',
    'nombre_asignatura',
    'clave_materia',
    'cve_materia',
    'docente',
    'profesor',
    'catedratico',
    'parcial_1',
    'parcial1',
    'calificacion_1',
    'calificacion1',
    'unidad_1',
    'u1',
  ];

  return subjectIndicators.some((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

/**
 * Extrae las calificaciones por unidad/parcial desde la estructura real del SII ITC:
 * "calificaiones": [
 *   { "id_calificacion": 2792708, "numero_calificacion": 1, "calificacion": "89" },
 *   { "id_calificacion": 2792710, "numero_calificacion": 3, "calificacion": null }
 * ]
 * así como cualquier otra variante (`calificaciones`, `unidades`, `parciales`, `u1..u10`).
 */
function extractSubjectPartials(item) {
  if (!item || typeof item !== 'object') return [];

  const partials = [];
  const seenLabels = new Set();

  const pushPartial = (unitNumberOrLabel, rawVal) => {
    const labelStr = String(unitNumberOrLabel).trim().toUpperCase();
    const cleanLabel = /^\d+$/.test(labelStr) ? `U${labelStr}` : labelStr;
    if (seenLabels.has(cleanLabel)) return;

    if (rawVal === null || rawVal === undefined || rawVal === '') {
      seenLabels.add(cleanLabel);
      partials.push({
        label: cleanLabel,
        value: null,
        display: '—',
        evaluated: false,
        isNa: false,
      });
      return;
    }

    if (typeof rawVal === 'object') {
      const unitGrade =
        rawVal.calificacion ??
        rawVal.calificacion_parcial ??
        rawVal.nota ??
        rawVal.promedio ??
        rawVal.valor ??
        rawVal.evaluacion ??
        rawVal.puntos ??
        null;
      pushPartial(cleanLabel, unitGrade);
      return;
    }

    const strVal = String(rawVal).trim().toUpperCase();
    if (!strVal || strVal === '-' || strVal === '—' || strVal === 'NULL' || strVal === '[OBJECT OBJECT]') {
      seenLabels.add(cleanLabel);
      partials.push({
        label: cleanLabel,
        value: null,
        display: '—',
        evaluated: false,
        isNa: false,
      });
      return;
    }

    if (strVal === 'NA' || strVal === 'N/A' || strVal === 'NO ACREDITADA' || strVal === 'REP') {
      seenLabels.add(cleanLabel);
      partials.push({
        label: cleanLabel,
        value: 0,
        display: 'NA',
        evaluated: true,
        isNa: true,
      });
      return;
    }

    const num = Number(strVal);
    if (!Number.isNaN(num)) {
      seenLabels.add(cleanLabel);
      partials.push({
        label: cleanLabel,
        value: num,
        display: Number.isInteger(num) ? String(num) : num.toFixed(1),
        evaluated: true,
        isNa: num < 70,
      });
    }
  };

  // 1. Revisar `calificaiones` (typo real del SII ITC) y equivalentes
  const unitContainers = [
    item.calificaiones,
    item.calificaciones,
    item.unidades,
    item.parciales,
    item.calificaciones_parciales,
    item.evaluaciones,
    item.notas,
  ];

  for (const container of unitContainers) {
    if (Array.isArray(container) && container.length > 0) {
      const looksLikeUnits = container.every(
        (el) =>
          el === null ||
          typeof el !== 'object' ||
          (!el.nombre_materia && !el.asignatura && !el.materias)
      );

      if (looksLikeUnits) {
        container.forEach((unitEntry, idx) => {
          if (unitEntry && typeof unitEntry === 'object') {
            const unitNum =
              unitEntry.numero_calificacion ??
              unitEntry.unidad ??
              unitEntry.numero_unidad ??
              unitEntry.no_unidad ??
              unitEntry.parcial ??
              unitEntry.numero ??
              idx + 1;
            const gradeVal =
              unitEntry.calificacion ??
              unitEntry.calificacion_parcial ??
              unitEntry.nota ??
              unitEntry.valor ??
              unitEntry.promedio ??
              unitEntry.puntos ??
              null;
            pushPartial(unitNum, gradeVal);
          } else {
            pushPartial(idx + 1, unitEntry);
          }
        });
        if (partials.length > 0) break;
      }
    } else if (container && typeof container === 'object' && !Array.isArray(container)) {
      const entries = Object.entries(container).filter(
        ([k]) => !WRAPPER_META_KEYS.has(k)
      );
      entries.forEach(([k, v], idx) => {
        const matchNum = k.match(/(\d+)/);
        const unitLabel = matchNum ? `U${matchNum[1]}` : `U${idx + 1}`;
        pushPartial(unitLabel, v);
      });
      if (partials.length > 0) break;
    }
  }

  // 2. Respaldo para llaves numeradas directas (calificacion_1, parcial_1, u1, etc.)
  const sourcesToScan = [
    item,
    item.materia && typeof item.materia === 'object' ? item.materia : null,
  ].filter(Boolean);

  if (partials.length === 0) {
    for (const src of sourcesToScan) {
      for (let i = 1; i <= 10; i += 1) {
        const candidateKeys = [
          `calificacion_${i}`,
          `calificacion${i}`,
          `parcial_${i}`,
          `parcial${i}`,
          `unidad_${i}`,
          `unidad${i}`,
          `u${i}`,
          `U${i}`,
          `p${i}`,
          `c${i}`,
          `calif_${i}`,
        ];

        for (const key of candidateKeys) {
          if (Object.prototype.hasOwnProperty.call(src, key)) {
            pushPartial(i, src[key]);
            break;
          }
        }
      }
    }
  }

  return partials;
}

/**
 * Calcula la calificación final o el promedio actual de las unidades ya evaluadas.
 */
function resolveFinalGrade(item, partials) {
  const directKeys = [
    'calificacion_final',
    'calificacionFinal',
    'promedio_final',
    'promedio',
    'calificacion',
    'final',
    'calif_final',
    'calif',
    'nota_final',
  ];

  const sources = [
    item,
    item.materia && typeof item.materia === 'object' ? item.materia : null,
  ].filter(Boolean);

  let rawCandidate = null;
  for (const src of sources) {
    for (const key of directKeys) {
      const val = src[key];
      if (val !== undefined && val !== null && typeof val !== 'object' && String(val).trim() !== '') {
        rawCandidate = val;
        break;
      }
    }
    if (rawCandidate !== null) break;
  }

  // Unidades que ya fueron calificadas por el docente (calificacion !== null)
  const evaluatedPartials = partials.filter((p) => p.evaluated);
  const totalUnitsCount = partials.length;
  const evaluatedUnitsCount = evaluatedPartials.length;
  const hasAnyFailedUnit = evaluatedPartials.some(
    (p) => p.isNa || (typeof p.value === 'number' && p.value < 70)
  );

  if (rawCandidate !== null) {
    const str = String(rawCandidate).trim().toUpperCase();
    if (str === 'NA' || str === 'N/A' || str === 'NO ACREDITADA' || str === 'REP') {
      return {
        numeric: 0,
        display: 'NA',
        isNa: true,
        isPartialAvg: false,
        evaluatedUnitsCount,
        totalUnitsCount,
      };
    }

    const num = Number(str);
    if (!Number.isNaN(num) && num > 0) {
      return {
        numeric: num,
        display: Number.isInteger(num) ? String(num) : num.toFixed(1),
        isNa: num < 70,
        isPartialAvg: false,
        evaluatedUnitsCount,
        totalUnitsCount,
      };
    }
  }

  // Calcular el promedio a partir de las unidades ya evaluadas (ej. U1=89, U2=91 -> 90)
  if (evaluatedUnitsCount > 0) {
    const sum = evaluatedPartials.reduce(
      (acc, p) => acc + (typeof p.value === 'number' ? p.value : 0),
      0
    );
    const rawAvg = sum / evaluatedUnitsCount;
    const roundedAvg = Number.isInteger(rawAvg)
      ? rawAvg
      : Number(rawAvg.toFixed(1));
    const isComplete = evaluatedUnitsCount === totalUnitsCount && totalUnitsCount > 0;

    return {
      numeric: roundedAvg,
      display: String(roundedAvg),
      isNa: roundedAvg < 70 || (isComplete && hasAnyFailedUnit),
      isPartialAvg: !isComplete,
      hasFailedUnit: hasAnyFailedUnit,
      evaluatedUnitsCount,
      totalUnitsCount,
    };
  }

  // Si todas las unidades están en `null` (ninguna unidad capturada todavía)
  return {
    numeric: null,
    display: 'Pendiente',
    isNa: false,
    isPartialAvg: true,
    hasFailedUnit: false,
    evaluatedUnitsCount: 0,
    totalUnitsCount,
  };
}

/**
 * Clasifica la asignatura según el semáforo de desempeño:
 * - Verde (green): >= 80
 * - Amarillo (yellow): 70 a 79, o pendiente de primera captura
 * - Rojo (red): < 70 o NA
 */
export function getSemaphoreMeta(numericGrade, isNa, isPartialAvg = false) {
  if (isNa || (numericGrade !== null && numericGrade < 70)) {
    return {
      level: 'red',
      label: 'En Riesgo (< 70)',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
      cardBorderClass: 'border-rose-500/30 hover:border-rose-500/50',
      dotClass: 'bg-rose-500 shadow-rose-500/50',
      barClass: 'from-rose-600 to-rose-400',
      scoreTextClass: 'text-rose-400',
      Icon: XCircle,
    };
  }

  if (numericGrade === null) {
    return {
      level: 'yellow',
      label: 'Sin Captura Aún',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
      cardBorderClass: 'border-slate-800 hover:border-amber-500/40',
      dotClass: 'bg-amber-400 shadow-amber-400/50',
      barClass: 'from-amber-500/60 to-yellow-400/60',
      scoreTextClass: 'text-amber-300',
      Icon: Clock,
    };
  }

  if (numericGrade >= 70 && numericGrade < 80) {
    return {
      level: 'yellow',
      label: isPartialAvg ? 'Regular (Parcial)' : 'Regular (70–79)',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
      cardBorderClass: 'border-amber-500/30 hover:border-amber-500/50',
      dotClass: 'bg-amber-400 shadow-amber-400/50',
      barClass: 'from-amber-500 to-yellow-400',
      scoreTextClass: 'text-amber-300',
      Icon: AlertCircle,
    };
  }

  return {
    level: 'green',
    label: isPartialAvg ? 'Óptimo (Parcial)' : 'Acreditado (≥ 80)',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    cardBorderClass: 'border-emerald-500/30 hover:border-emerald-500/50',
    dotClass: 'bg-emerald-400 shadow-emerald-400/50',
    barClass: 'from-emerald-500 to-teal-400',
    scoreTextClass: 'text-emerald-400',
    Icon: CheckCircle2,
  };
}

/**
 * Construye una etiqueta legible para el objeto `periodo` del SII ITC:
 * `{ clave_periodo: "26/2", anio: 2026, descripcion_periodo: "Agosto - Diciembre 2026" }`
 * -> `"Agosto - Diciembre 2026 (26/2)"`
 */
function formatPeriodoObject(periodoNode, fallback = '') {
  if (!periodoNode) return fallback;
  if (typeof periodoNode === 'string' || typeof periodoNode === 'number') {
    const clean = String(periodoNode).trim();
    return clean && clean !== '[object Object]' ? clean : fallback;
  }

  if (typeof periodoNode === 'object') {
    const desc = pickText(periodoNode, [
      'descripcion_periodo',
      'identificacion_larga',
      'identificacion_corta',
      'nombre_periodo',
      'periodo_descripcion',
    ]);
    const clave = pickText(periodoNode, ['clave_periodo', 'periodo', 'ciclo']);

    if (desc && clave && !desc.includes(clave)) {
      return `${desc} (${clave})`;
    }
    if (desc) return desc;
    if (clave) return clave;
  }

  return extractText(periodoNode, fallback);
}

/**
 * Normaliza la respuesta completa de GET /api/movil/estudiante/calificaciones.
 */
export function normalizeCalificacionesList(rawPayload) {
  if (!rawPayload) return [];

  let payload = unwrapSiiPayload(rawPayload);
  if (!payload || typeof payload !== 'object') return [];

  if (!Array.isArray(payload)) {
    const innerArray =
      payload.data ||
      payload.calificaciones ||
      payload.calificaiones ||
      payload.materias ||
      payload.asignaturas;

    if (Array.isArray(innerArray)) {
      payload = innerArray;
    }
  }

  const rawSubjectEntries = [];

  const collectEntries = (node, inheritedPeriod = '') => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach((el) => collectEntries(el, inheritedPeriod));
      return;
    }

    if (typeof node !== 'object') return;

    // Si el nodo tiene `periodo` y `materias` (estructura exacta del SII ITC)
    if (Array.isArray(node.materias)) {
      const periodLabel = formatPeriodoObject(node.periodo, inheritedPeriod);
      node.materias.forEach((sub) => collectEntries(sub, periodLabel));
      return;
    }

    // Si el nodo ya es un registro de materia
    if (isSubjectEntry(node)) {
      rawSubjectEntries.push({
        ...node,
        _inheritedPeriod: inheritedPeriod,
      });
      return;
    }

    // Diccionario indexado por periodo
    Object.entries(node).forEach(([key, val]) => {
      if (WRAPPER_META_KEYS.has(key)) return;
      if (Array.isArray(val) || (val && typeof val === 'object')) {
        const nextPeriod = !/^\d+$/.test(key) ? key : inheritedPeriod;
        collectEntries(val, nextPeriod);
      }
    });
  };

  collectEntries(payload, '');

  return rawSubjectEntries.map((item, idx) => {
    const materiaObj =
      item.materia && typeof item.materia === 'object' ? item.materia : {};
    const grupoObj =
      item.grupo && typeof item.grupo === 'object' ? item.grupo : {};
    const docenteObj =
      (item.docente && typeof item.docente === 'object' ? item.docente : null) ||
      (item.profesor && typeof item.profesor === 'object' ? item.profesor : null) ||
      (materiaObj.docente && typeof materiaObj.docente === 'object'
        ? materiaObj.docente
        : null) ||
      {};

    const nombreMateria =
      pickText(materiaObj, [
        'nombre_materia',
        'nombre_completo',
        'nombre_corto',
        'nombre_abreviado_materia',
        'nombre',
        'descripcion',
      ]) ||
      pickText(item, [
        'nombre_materia',
        'nombreMateria',
        'nombre_asignatura',
        'asignatura',
      ]) ||
      extractText(item.materia, `Asignatura ${idx + 1}`);

    const clave =
      pickText(materiaObj, [
        'clave_materia',
        'cve_materia',
        'clave',
        'codigo',
      ]) ||
      pickText(item, [
        'clave_materia',
        'cve_materia',
        'clave',
        'codigo',
      ]) ||
      `MAT-${idx + 1}`;

    const grupo =
      pickText(materiaObj, ['letra_grupo', 'cve_grupo', 'grupo']) ||
      pickText(grupoObj, ['letra_grupo', 'cve_grupo', 'grupo', 'letra']) ||
      pickText(item, ['letra_grupo', 'cve_grupo', 'grupo']) ||
      '';

    const idGrupo =
      pickText(materiaObj, ['id_grupo']) || pickText(item, ['id_grupo']) || '';

    const periodo =
      formatPeriodoObject(item.periodo, '') ||
      formatPeriodoObject(materiaObj.periodo, '') ||
      extractText(item._inheritedPeriod, '') ||
      'Periodo Actual';

    const docente =
      pickText(docenteObj, ['nombre_completo', 'nombre_docente', 'nombre']) ||
      extractText(item.docente, '') ||
      extractText(item.profesor, '') ||
      extractText(materiaObj.docente, '') ||
      '';

    const partials = extractSubjectPartials(item);
    const {
      numeric,
      display,
      isNa,
      isPartialAvg,
      evaluatedUnitsCount,
      totalUnitsCount,
    } = resolveFinalGrade(item, partials);

    const semaphore = getSemaphoreMeta(numeric, isNa, isPartialAvg);

    return {
      id: `${clave}-${idGrupo || idx}-${periodo}`,
      nombreMateria,
      periodo,
      clave,
      grupo: grupo && grupo !== clave ? grupo : null,
      idGrupo: idGrupo || null,
      docente: docente || null,
      partials,
      calificacionNumeric: numeric,
      calificacionDisplay: display,
      isPartialAvg,
      evaluatedUnitsCount,
      totalUnitsCount,
      semaphore,
    };
  });
}
