import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'sii_jwt_token';
export const USER_EMAIL_STORAGE_KEY = 'sii_user_email';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, ''); // Para producción en Render
  }
  return `http://${window.location.hostname}:4000/api`; // Funciona en 100.71.219.2 (Tailscale) y en localhost
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de solicitud: adjunta automáticamente Authorization: Bearer <token>
api.interceptors.request.use(
  (config) => {
    // TODO(security): Se lee el token desde localStorage por requerimiento explícito de la
    // arquitectura del proyecto. En entornos bancarios/empresariales se recomienda cookie HttpOnly.
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: detecta expiración o invalidez del token (401) en rutas protegidas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || '');
    const isLoginEndpoint = requestUrl.includes('/login');

    if (error?.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent('sii:session-expired', {
          detail: {
            message:
              error?.response?.data?.message ||
              'Tu sesión en el SII ITC ha expirado. Inicia sesión nuevamente.',
          },
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;
