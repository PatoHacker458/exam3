const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const hasValidCredentials =
  Boolean(supabaseUrl && supabaseKey) &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('tu-proyecto.supabase.co');

let supabase = null;

if (hasValidCredentials) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (_err) {
    console.warn(
      '[Supabase] No se pudo inicializar el cliente. Operando en modo fallback local.'
    );
    supabase = null;
  }
} else {
  console.info(
    '[Supabase] Credenciales no configuradas. El cliente opera en modo fallback seguro (Puntos 1-4 activos; Punto 5 listo para Integrante 2).'
  );
}

/**
 * Devuelve el estado actual de la conexión con Supabase sin exponer llaves secretas.
 */
function getSupabaseStatus() {
  return {
    configured: Boolean(supabase),
    mode: supabase ? 'connected' : 'fallback_mock',
  };
}

module.exports = {
  supabase,
  isSupabaseConfigured: Boolean(supabase),
  getSupabaseStatus,
};

