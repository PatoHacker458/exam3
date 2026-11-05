require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const siiRoutes = require('./routes/sii.routes');
const extraRoutes = require('./routes/extra.routes');
const { getSupabaseStatus } = require('./config/supabase');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Cabeceras HTTP de seguridad (X-Content-Type-Options: nosniff, X-Frame-Options: DENY)
app.use(
  helmet({
    contentSecurityPolicy: false,
    strictTransportSecurity: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
  })
);

// Deshabilitar características del navegador no utilizadas
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});

// TODO(security): Se habilita `origin: true` para permitir el acceso dinámico desde IPs
// de Tailscale (ej. http://100.71.219.2:5173), localhost y Render.
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Lista blanca de métodos HTTP permitidos (bloquea TRACE, PUT, DELETE no usados)
app.use((req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      ok: false,
      status: 405,
      message: `Método HTTP ${req.method} no permitido.`,
    });
  }
  return next();
});

// Limitador de tasa de peticiones para proteger la API y evitar fuerza bruta
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    status: 429,
    message: 'Demasiadas solicitudes desde esta dirección IP. Intenta más tarde.',
  },
});

app.use('/api', apiLimiter);

// Parseo seguro de JSON con límite de tamaño para evitar ataques DoS
app.use(express.json({ limit: '100kb' }));

// Healthcheck endpoint para Docker y Render
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'sii-itc-backend-proxy',
    status: 'healthy',
    supabase: getSupabaseStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Montaje principal de rutas:
// 1. Proxy hacia SII ITC Celaya (Tarea Integrante 1)
app.use('/api/sii', siiRoutes);
// Alias directo en /api para compatibilidad con rutas estándar (/api/login y /api/movil/estudiante/*)
app.use('/api', siiRoutes);

// 2. Funcionalidad adicional Punto 5 (Cascarón para Integrante 2)
app.use('/api/extra', extraRoutes);

// Manejador 404 para rutas no existentes
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    status: 404,
    message: 'Ruta no encontrada en el servidor intermedio SII ITC.',
  });
});

// Manejador global de errores sin exponer trazas ni datos sensibles
app.use((err, _req, res, _next) => {
  const isCorsError = err && String(err.message).includes('CORS');
  const statusCode = isCorsError ? 403 : 500;
  res.status(statusCode).json({
    ok: false,
    status: statusCode,
    message: isCorsError
      ? 'Origen bloqueado por política de seguridad CORS.'
      : 'Error interno en el servidor intermedio.',
  });
});

// TODO(security): Se escucha en 0.0.0.0 para aceptar conexiones desde Docker y red Tailscale.
app.listen(PORT, '0.0.0.0', () => {
  console.info(
    `[Backend SII ITC] Servidor intermedio escuchando en http://0.0.0.0:${PORT}`
  );
});
