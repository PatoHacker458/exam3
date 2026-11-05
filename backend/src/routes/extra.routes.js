// ============================================================================
// Rutas adicionales — LinceHub / Asesorías Académicas
// Montado en: /api/extra
// ============================================================================

const express = require('express');
const { supabase, getSupabaseStatus } = require('../config/supabase');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

let asesoriasMemoria = [
  { id: '1', materia: 'Cálculo Integral', mentor: 'Ana López (8vo Sem)', modalidad: 'Presencial', salon: 'LRC', cupo_maximo: 15, cupo_ocupado: 0, estado: 'Activa' },
  { id: '2', materia: 'Desarrollos Móviles y Tecnologías en la Nube', mentor: 'Carlos Ruiz (9no Sem)', modalidad: 'Presencial', salon: 'LMM', cupo_maximo: 20, cupo_ocupado: 5, estado: 'Activa' },
  { id: '3', materia: 'Administración de Redes', mentor: 'María Fernández (7mo Sem)', modalidad: 'Presencial', salon: 'LPA', cupo_maximo: 10, cupo_ocupado: 9, estado: 'Activa' },
  { id: '4', materia: 'Ecuaciones Diferenciales', mentor: 'Roberto Gómez (6to Sem)', modalidad: 'Híbrido', salon: 'Centro de Información', cupo_maximo: 25, cupo_ocupado: 10, estado: 'Activa' },
  { id: '5', materia: 'Tópicos Avanzados de Desarrollo Web', mentor: 'Diana Torres (9no Sem)', modalidad: 'En Línea', salon: 'Teams', cupo_maximo: 30, cupo_ocupado: 30, estado: 'Activa' },
  { id: '6', materia: 'Ciberseguridad', mentor: 'Luis Márquez (8vo Sem)', modalidad: 'Presencial', salon: 'LRC', cupo_maximo: 15, cupo_ocupado: 0, estado: 'Pendiente' },
];

function warnSupabaseFallback(operation, error) {
  console.warn(
    `[LinceHub] Supabase falló en ${operation}; se usará la persistencia en memoria.`,
    error && error.message ? error.message : error,
  );
}

function findMemorySession(id) {
  return asesoriasMemoria.findIndex((asesoria) => String(asesoria.id) === id);
}

function getAssessment(calificaciones, kardex) {
  const materiasEnRiesgo = [];
  let creditosAprobados = 0;

  if (Array.isArray(kardex)) {
    kardex.forEach((mat) => {
      if (mat && (mat.calificacion === 'AC' || Number(mat.calificacion) >= 70)) {
        const creditos = Number(mat.creditos || 0);
        if (Number.isFinite(creditos)) creditosAprobados += creditos;
      }
    });
  }

  if (Array.isArray(calificaciones)) {
    calificaciones.forEach((item) => {
      const materia = item && item.materia ? item.materia : {};
      const notas = item && (item.calificaiones || item.calificaciones);
      let unidadesReprobadas = 0;

      if (Array.isArray(notas)) {
        notas.forEach((nota) => {
          const calificacion = nota && nota.calificacion;
          if (
            calificacion !== null &&
            calificacion !== undefined &&
            calificacion !== '' &&
            Number(calificacion) < 70
          ) {
            unidadesReprobadas += 1;
          }
        });
      }

      if (unidadesReprobadas > 0) {
        materiasEnRiesgo.push({
          materia: materia.nombre_materia,
          clave: materia.clave_materia,
          unidadesReprobadas,
          nivelRiesgo: unidadesReprobadas > 2 ? 'Crítico' : 'Preventivo',
          recomendacion: 'Se sugiere inscripción inmediata a LinceHub Asesorías.',
        });
      }
    });
  }

  return {
    timestamp: new Date().toISOString(),
    estadoGeneral: materiasEnRiesgo.length > 0 ? 'Alerta Académica' : 'Óptimo',
    materiasEnRiesgo,
    creditosAprobados,
    mensaje:
      materiasEnRiesgo.length > 0
        ? `Tienes ${materiasEnRiesgo.length} materia(s) en riesgo de segunda oportunidad.`
        : '¡Excelente desempeño! No tienes unidades reprobadas actualmente.',
    source: 'local-fallback',
  };
}

router.get('/status', (_req, res) => {
  return res.status(200).json({
    ok: true,
    module: 'LinceHub - Asesorías Académicas',
    supabase: getSupabaseStatus(),
    message: 'El módulo de asesorías está activo.',
  });
});

router.get('/items', authMiddleware, (_req, res) => {
  return res.status(200).json({
    ok: true,
    configuredWithSupabase: Boolean(supabase),
    items: [],
    message: 'Cascarón GET /api/extra/items listo para el Integrante 2.',
  });
});

router.post('/items', authMiddleware, (req, res) => {
  return res.status(201).json({
    ok: true,
    received: Boolean(req.body),
    message: 'Cascarón POST /api/extra/items listo para el Integrante 2.',
  });
});

router.get('/asesorias', async (_req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('asesorias_itc')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) {
        warnSupabaseFallback('listar asesorías', error);
      } else {
        asesoriasMemoria = Array.isArray(data) ? data : [];
        return res.json({ data: asesoriasMemoria, source: 'supabase' });
      }
    } catch (error) {
      warnSupabaseFallback('listar asesorías', error);
    }
  }

  return res.json({ data: asesoriasMemoria, source: 'memory' });
});

router.post('/asesorias', authMiddleware, async (req, res) => {
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {};
  const cupoMaximo = Number(body.cupo_maximo);

  if (
    typeof body.materia !== 'string' ||
    !body.materia.trim() ||
    typeof body.mentor !== 'string' ||
    !body.mentor.trim() ||
    !Number.isInteger(cupoMaximo) ||
    cupoMaximo < 1
  ) {
    return res.status(400).json({
      error: 'Materia, mentor y un cupo_maximo entero mayor que cero son requeridos.',
    });
  }

  const nueva = {
    ...body,
    id: `${Date.now()}`,
    cupo_maximo: cupoMaximo,
    cupo_ocupado: 0,
    estado: 'Pendiente',
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('asesorias_itc')
        .insert([nueva])
        .select()
        .single();

      if (error) {
        warnSupabaseFallback('crear asesoría', error);
      } else {
        asesoriasMemoria.unshift(data);
        return res.status(201).json({ data, source: 'supabase' });
      }
    } catch (error) {
      warnSupabaseFallback('crear asesoría', error);
    }
  }

  asesoriasMemoria.unshift(nueva);
  return res.status(201).json({ data: nueva, source: 'memory' });
});

router.patch('/asesorias/:id/estado', authMiddleware, async (req, res) => {
  const { estado } = req.body || {};
  if (typeof estado !== 'string' || !estado.trim()) {
    return res.status(400).json({ error: 'El estado es requerido.' });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('asesorias_itc')
        .update({ estado })
        .eq('id', req.params.id)
        .select()
        .maybeSingle();

      if (error) {
        warnSupabaseFallback('actualizar estado', error);
      } else if (data) {
        const index = findMemorySession(req.params.id);
        if (index >= 0) asesoriasMemoria[index] = data;
        else asesoriasMemoria.unshift(data);
        return res.json({ data, source: 'supabase' });
      } else {
        return res.status(404).json({ error: 'Asesoría no encontrada.' });
      }
    } catch (error) {
      warnSupabaseFallback('actualizar estado', error);
    }
  }

  const index = findMemorySession(req.params.id);
  if (index < 0) {
    return res.status(404).json({ error: 'Asesoría no encontrada.' });
  }
  asesoriasMemoria[index] = { ...asesoriasMemoria[index], estado };
  return res.json({ data: asesoriasMemoria[index], source: 'memory' });
});

router.delete('/asesorias/:id', authMiddleware, async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('asesorias_itc')
        .delete()
        .eq('id', req.params.id)
        .select('id');

      if (error) {
        warnSupabaseFallback('eliminar asesoría', error);
      } else if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Asesoría no encontrada.' });
      } else {
        asesoriasMemoria = asesoriasMemoria.filter(
          (asesoria) => String(asesoria.id) !== req.params.id,
        );
        return res.json({ success: true, source: 'supabase' });
      }
    } catch (error) {
      warnSupabaseFallback('eliminar asesoría', error);
    }
  }

  const index = findMemorySession(req.params.id);
  if (index < 0) {
    return res.status(404).json({ error: 'Asesoría no encontrada.' });
  }
  asesoriasMemoria = asesoriasMemoria.filter(
    (asesoria) => String(asesoria.id) !== req.params.id,
  );
  return res.json({ success: true, source: 'memory' });
});

router.post('/inscribir/:id', authMiddleware, async (req, res) => {
  if (supabase) {
    try {
      const { data: current, error: readError } = await supabase
        .from('asesorias_itc')
        .select('id, cupo_maximo, cupo_ocupado')
        .eq('id', req.params.id)
        .maybeSingle();

      if (readError) {
        warnSupabaseFallback('consultar cupo', readError);
      } else if (!current) {
        return res.status(404).json({ error: 'Asesoría no encontrada.' });
      } else if (Number(current.cupo_ocupado) >= Number(current.cupo_maximo)) {
        return res.status(409).json({ error: 'La asesoría ya no tiene cupo disponible.' });
      } else {
        const memoryIndex = findMemorySession(req.params.id);
        const currentMemory = {
          ...(memoryIndex >= 0 ? asesoriasMemoria[memoryIndex] : {}),
          ...current,
        };
        if (memoryIndex >= 0) asesoriasMemoria[memoryIndex] = currentMemory;
        else asesoriasMemoria.unshift(currentMemory);

        const { data, error } = await supabase
          .from('asesorias_itc')
          .update({ cupo_ocupado: Number(current.cupo_ocupado) + 1 })
          .eq('id', req.params.id)
          .select()
          .single();

        if (error) {
          warnSupabaseFallback('inscribir estudiante', error);
        } else {
          const index = findMemorySession(req.params.id);
          if (index >= 0) asesoriasMemoria[index] = data;
          else asesoriasMemoria.unshift(data);
          return res.json({ success: true, data, source: 'supabase' });
        }
      }
    } catch (error) {
      warnSupabaseFallback('inscribir estudiante', error);
    }
  }

  const index = findMemorySession(req.params.id);
  if (index < 0) {
    return res.status(404).json({ error: 'Asesoría no encontrada.' });
  }
  const asesoria = asesoriasMemoria[index];
  if (Number(asesoria.cupo_ocupado) >= Number(asesoria.cupo_maximo)) {
    return res.status(409).json({ error: 'La asesoría ya no tiene cupo disponible.' });
  }
  asesoriasMemoria[index] = {
    ...asesoria,
    cupo_ocupado: Number(asesoria.cupo_ocupado) + 1,
  };
  return res.json({
    success: true,
    data: asesoriasMemoria[index],
    source: 'memory',
  });
});

router.post('/advisor', authMiddleware, async (req, res) => {
  const { calificaciones, kardex } = req.body || {};

  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('academic-advisor', {
        body: { calificaciones, kardex },
      });
      if (error) {
        warnSupabaseFallback('diagnóstico académico', error);
      } else if (data) {
        return res.json({ ...data, source: 'supabase' });
      }
    } catch (error) {
      warnSupabaseFallback('diagnóstico académico', error);
    }
  }

  return res.json(getAssessment(calificaciones, kardex));
});

module.exports = router;
