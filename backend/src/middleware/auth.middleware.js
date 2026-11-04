/**
 * Middleware de autenticación que verifica la presencia y estructura válida
 * del header `Authorization: Bearer <token>` antes de reenviar peticiones al SII ITC.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      ok: false,
      status: 401,
      message: 'Acceso denegado: Se requiere el encabezado Authorization Bearer.',
    });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      ok: false,
      status: 401,
      message: 'Formato de autorización inválido. Use: Authorization: Bearer <token>.',
    });
  }

  const token = parts[1].trim();

  if (
    !token ||
    token === 'null' ||
    token === 'undefined' ||
    token.length < 16 ||
    token.length > 4096
  ) {
    return res.status(401).json({
      ok: false,
      status: 401,
      message: 'Token JWT inválido o malformado.',
    });
  }

  // Si el token tiene estructura JWT de 3 segmentos, validamos que no use alg "none" y no haya expirado
  const segments = token.split('.');
  if (segments.length === 3) {
    try {
      const headerJson = Buffer.from(segments[0], 'base64url').toString('utf8');
      const header = JSON.parse(headerJson);
      if (!header.alg || String(header.alg).toLowerCase() === 'none') {
        return res.status(401).json({
          ok: false,
          status: 401,
          message: 'Algoritmo de token JWT no permitido.',
        });
      }

      const payloadJson = Buffer.from(segments[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);
      if (payload.exp && typeof payload.exp === 'number') {
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (payload.exp <= nowSeconds) {
          return res.status(401).json({
            ok: false,
            status: 401,
            message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
          });
        }
      }
    } catch (_err) {
      // Si el SII emite un token opaco o con codificación distinta, dejamos que el SII ITC lo valide
    }
  }

  req.token = token;
  return next();
}

module.exports = authMiddleware;

