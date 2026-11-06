const express = require('express');
const https = require('https');
const axios = require('axios');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

const SII_API_BASE_URL = (
  process.env.SII_API_BASE_URL || 'https://sii.celaya.tecnm.mx/api'
).replace(/\/+$/, '');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const siiClient = axios.create({
  baseURL: SII_API_BASE_URL,
  timeout: 15000,
  httpsAgent,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});


function extractJwtToken(data) {
  if (!data || typeof data !== 'object') return null;

  const token =
    data?.message?.login?.token ||
    data?.data?.token ||
    data?.token ||
    data?.message?.token ||
    data?.data?.login?.token ||
    data?.login?.token ||
    data?.access_token;

  if (typeof token === 'string' && token.trim().length > 10) {
    return token.trim();
  }
  return null;
}


function isSiiUnauthorizedPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.status === 401 || payload.data === 401 || payload.status === 403) {
    return true;
  }
  const codeTxt = String(payload.responseCodeTxt || '').toLowerCase();
  if (codeTxt.includes('401') || codeTxt.includes('unauthorized')) {
    return true;
  }
  const errTxt = String(payload.error || '').toLowerCase();
  if (errTxt.includes('invalid') || errTxt.includes('expired') || errTxt.includes('unauthorized')) {
    return true;
  }
  return false;
}

async function attemptSiiLogin(emailCandidate, password) {
  const response = await siiClient.post('/login', {
    email: emailCandidate,
    password,
  });

  const data = response.data;
  if (isSiiUnauthorizedPayload(data)) {
    return { ok: false, data, token: null };
  }

  const token = extractJwtToken(data);
  if (!token) {
    return { ok: false, data, token: null };
  }

  return { ok: true, data, token, emailUsed: emailCandidate };
}



router.post('/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;

  if (
    typeof rawEmail !== 'string' ||
    typeof rawPassword !== 'string' ||
    !rawEmail.trim() ||
    !rawPassword.trim()
  ) {
    return res.status(400).json({
      ok: false,
      status: 400,
      message: 'Por favor ingresa tu correo institucional y tu contraseña.',
    });
  }

  const email = rawEmail.trim();
  const password = rawPassword;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.length > 120 || password.length > 128 || !emailRegex.test(email)) {
    return res.status(400).json({
      ok: false,
      status: 400,
      message: 'El formato del correo electrónico no es válido.',
    });
  }

  try {
    // Primer intento con el correo tal como lo ingresó el estudiante
    let result = await attemptSiiLogin(email, password).catch((err) => {
      if (
        err.response &&
        [400, 401, 403, 422].includes(err.response.status)
      ) {
        return { ok: false, data: err.response.data, token: null };
      }
      throw err;
    });

    // Si el primer intento falla y el correo inicia con 'l' minúscula, reintentar con 'L' mayúscula
    // (o viceversa si inició con 'L' mayúscula)
    if (!result.ok && /^[lL]\d/.test(email)) {
      const toggledPrefix = email[0] === 'l' ? 'L' : 'l';
      const altEmail = `${toggledPrefix}${email.slice(1)}`;

      result = await attemptSiiLogin(altEmail, password).catch((err) => {
        if (
          err.response &&
          [400, 401, 403, 422].includes(err.response.status)
        ) {
          return { ok: false, data: err.response.data, token: null };
        }
        throw err;
      });
    }

    if (!result.ok || !result.token) {
      return res.status(401).json({
        ok: false,
        status: 401,
        message:
          'Credenciales incorrectas. Verifica tu correo institucional (@celaya.tecnm.mx) y contraseña.',
      });
    }

    return res.status(200).json({
      ...(typeof result.data === 'object' ? result.data : {}),
      ok: true,
      status: 200,
      flag: 'success',
      token: result.token,
      user: {
        email: result.emailUsed || email,
      },
    });
  } catch (error) {
    if (error.response) {
      const upstreamStatus = error.response.status;
      if (upstreamStatus === 401 || upstreamStatus === 403 || upstreamStatus === 422) {
        return res.status(401).json({
          ok: false,
          status: 401,
          message:
            'Credenciales incorrectas. Verifica tu correo institucional (@celaya.tecnm.mx) y contraseña.',
        });
      }
      if (upstreamStatus === 429) {
        return res.status(429).json({
          ok: false,
          status: 429,
          message:
            'Demasiados intentos en el servidor institucional SII ITC. Espera un minuto antes de reintentar.',
        });
      }
    }

    return res.status(503).json({
      ok: false,
      status: 503,
      message:
        'El servidor del SII ITC (sii.celaya.tecnm.mx) no está disponible en este momento. Verifica tu conexión o intenta más tarde.',
    });
  }
});

/**
 * Helper genérico para reenviar peticiones GET autenticadas hacia los endpoints móviles del SII ITC.
 */
function createSiiProxyHandler(siiEndpointPath, resourceLabel) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    try {
      const response = await siiClient.get(siiEndpointPath, {
        headers: {
          Authorization: `Bearer ${req.token}`,
        },
      });

      const siiData = response.data;

      if (siiEndpointPath === '/movil/estudiante') {
        console.log(
          'ESTRUCTURA REAL SII ESTUDIANTE:',
          JSON.stringify(response.data, null, 2).slice(0, 3000)
        );
      } else if (siiEndpointPath === '/movil/estudiante/calificaciones') {
        console.log(
          'ESTRUCTURA REAL SII CALIFICACIONES:',
          JSON.stringify(response.data, null, 2).slice(0, 3000)
        );
      }

      if (isSiiUnauthorizedPayload(siiData)) {
        return res.status(401).json({
          ok: false,
          status: 401,
          message:
            'Tu sesión del SII ITC expiró o el token es inválido. Por favor inicia sesión nuevamente.',
        });
      }

      return res.status(200).json(siiData);
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return res.status(401).json({
            ok: false,
            status: 401,
            message:
              'Tu sesión del SII ITC expiró o el token es inválido. Por favor inicia sesión nuevamente.',
          });
        }
        if (status === 404) {
          return res.status(404).json({
            ok: false,
            status: 404,
            message: `No se encontró información de ${resourceLabel} para este estudiante en el SII ITC.`,
          });
        }
        if (status === 429) {
          return res.status(429).json({
            ok: false,
            status: 429,
            message:
              'Límite de peticiones alcanzado en el servidor SII ITC. Intenta de nuevo en unos segundos.',
          });
        }
      }

      return res.status(503).json({
        ok: false,
        status: 503,
        message: `Error de comunicación al consultar ${resourceLabel} en el servidor SII ITC. Intenta nuevamente.`,
      });
    }
  };
}

// ============================================================================
// ENDPOINTS PROTEGIDOS DEL SII ITC (Soportan ruta corta y ruta móvil completa)
// ============================================================================

// Punto 2: Información del estudiante -> GET /api/movil/estudiante
router.get(
  ['/estudiante', '/movil/estudiante'],
  authMiddleware,
  createSiiProxyHandler('/movil/estudiante', 'perfil del estudiante')
);

// Punto 3: Calificaciones -> GET /api/movil/estudiante/calificaciones
router.get(
  ['/calificaciones', '/movil/estudiante/calificaciones'],
  authMiddleware,
  createSiiProxyHandler('/movil/estudiante/calificaciones', 'calificaciones')
);

// Punto 4: Kardex -> GET /api/movil/estudiante/kardex (Listo para Integrante 2)
router.get(
  ['/kardex', '/movil/estudiante/kardex'],
  authMiddleware,
  createSiiProxyHandler('/movil/estudiante/kardex', 'kardex académico')
);

// Punto 4: Horarios -> GET /api/movil/estudiante/horarios (Listo para Integrante 2)
router.get(
  ['/horarios', '/movil/estudiante/horarios'],
  authMiddleware,
  createSiiProxyHandler('/movil/estudiante/horarios', 'horario de clases')
);

module.exports = router;
