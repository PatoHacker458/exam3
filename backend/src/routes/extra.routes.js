// ============================================================================
// CASCARÓN DE RUTAS ADICIONALES — PUNTO 5 (TAREA DEL INTEGRANTE 2)
// Ruta: backend/src/routes/extra.routes.js
// Montado en: /api/extra (ver backend/src/server.js)
// Descripción: Este archivo está listo para que el Integrante 2 implemente el
// backend de administración propio para el Punto 5 (LinceHub / Funcionalidad
// Adicional) usando Supabase o persistencia simulada SIN tocar server.js ni
// generar conflictos de merge con el Integrante 1.
// ============================================================================

const express = require('express');
const { supabase, getSupabaseStatus } = require('../config/supabase');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * GET /api/extra/status
 * Verifica el estado del módulo adicional (Punto 5) y la conexión a Supabase.
 */
router.get('/status', (_req, res) => {
  return res.status(200).json({
    ok: true,
    module: 'LinceHub - Funcionalidad Adicional (Punto 5)',
    owner: 'Integrante 2',
    supabase: getSupabaseStatus(),
    message:
      'Endpoints base de /api/extra activos. Listo para que el Integrante 2 desarrolle el Punto 5.',
  });
});

/**
 * GET /api/extra/items
 * Endpoint cascarón protegido para listar recursos de la funcionalidad adicional.
 * TODO (Integrante 2): Conectar con tabla de Supabase (`supabase.from('...')`) o datos simulados.
 */
router.get('/items', authMiddleware, async (_req, res) => {
  // Ejemplo de referencia para Integrante 2:
  // if (supabase) {
  //   const { data, error } = await supabase.from('lincehub_items').select('*');
  //   ...
  // }
  return res.status(200).json({
    ok: true,
    configuredWithSupabase: Boolean(supabase),
    items: [],
    message: 'Cascarón GET /api/extra/items listo para el Integrante 2.',
  });
});

/**
 * POST /api/extra/items
 * Endpoint cascarón protegido para crear registros en la funcionalidad adicional.
 * TODO (Integrante 2): Implementar lógica de negocio del Punto 5.
 */
router.post('/items', authMiddleware, async (req, res) => {
  return res.status(201).json({
    ok: true,
    received: Boolean(req.body),
    message: 'Cascarón POST /api/extra/items listo para el Integrante 2.',
  });
});

module.exports = router;

