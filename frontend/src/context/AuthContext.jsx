import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
} from '../services/api.js';

const AuthContext = createContext(null);

/**
 * Decodifica de forma segura el payload de un JWT para verificar su fecha de expiración (`exp`).
 */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_err) {
    return null;
  }
}

/**
 * Comprueba si un token JWT ha expirado según su claim `exp`.
 */
export function isJwtExpired(token) {
  if (!token || typeof token !== 'string') return true;
  const payload = parseJwtPayload(token);
  if (payload && typeof payload.exp === 'number') {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowInSeconds;
  }
  return false;
}

/**
 * Enmascara parcialmente un correo electrónico para proteger PII en vistas públicas/barras.
 * Ejemplo: "125030002@celaya.tecnm.mx" -> "125***002@celaya.tecnm.mx"
 */
export function maskInstitutionalEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'Estudiante ITC';
  }
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 4) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 3)}***${localPart.slice(-3)}@${domain}`;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [sessionAlert, setSessionAlert] = useState('');

  // Limpiar cualquier rastro previo en localStorage/sessionStorage al iniciar para no exponer tokens en DevTools
  useEffect(() => {
    clearAuthToken();
    setIsLoadingAuth(false);
  }, []);

  // Escuchar evento global disparado por el interceptor de Axios cuando el SII devuelve 401
  useEffect(() => {
    const handleSessionExpired = (event) => {
      clearAuthToken();
      setToken(null);
      setUserEmail('');
      setSessionAlert(
        event?.detail?.message ||
          'Tu sesión en el SII ITC ha expirado o el token es inválido.'
      );
    };

    window.addEventListener('sii:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('sii:session-expired', handleSessionExpired);
    };
  }, []);

  /**
   * Inicia sesión enviando credenciales a POST /api/sii/login
   */
  const login = useCallback(async (email, password) => {
    setSessionAlert('');

    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      return {
        ok: false,
        message: 'Por favor completa tanto tu correo institucional como tu contraseña.',
      };
    }

    try {
      const response = await api.post('/sii/login', {
        email: cleanEmail,
        password: cleanPassword,
      });

      const data = response.data;
      const extractedToken =
        data?.token ||
        data?.message?.login?.token ||
        data?.data?.token ||
        data?.access_token;

      if (!extractedToken) {
        return {
          ok: false,
          message:
            data?.message ||
            'Credenciales incorrectas o respuesta inválida del servidor SII ITC.',
        };
      }

      setAuthToken(extractedToken);
      setToken(extractedToken);
      setUserEmail(cleanEmail);

      return { ok: true };
    } catch (error) {
      if (!error.response) {
        return {
          ok: false,
          message:
            'No se pudo conectar con el servidor intermedio o el SII ITC no está disponible.',
        };
      }

      const status = error.response.status;
      const serverMessage = error.response.data?.message;

      if (status === 400) {
        return {
          ok: false,
          message: serverMessage || 'Verifica que los campos tengan un formato válido.',
        };
      }

      if (status === 401 || status === 403) {
        return {
          ok: false,
          message:
            serverMessage ||
            'Credenciales incorrectas. Verifica tu correo institucional y contraseña.',
        };
      }

      return {
        ok: false,
        message:
          serverMessage ||
          'El servidor del SII ITC no está disponible temporalmente. Intenta más tarde.',
      };
    }
  }, []);

  /**
   * Cierra la sesión limpiando memoria privada y redirigiendo a /login
   */
  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUserEmail('');
    setSessionAlert('');
    window.location.href = '/login';
  }, []);

  /**
   * Verifica activamente si el token actual en memoria sigue siendo válido.
   */
  const verifySession = useCallback(() => {
    const currentToken = getAuthToken() || token;
    if (!currentToken || isJwtExpired(currentToken)) {
      if (token) {
        clearAuthToken();
        setToken(null);
        setUserEmail('');
        setSessionAlert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      }
      return false;
    }
    return true;
  }, [token]);

  const value = {
    token,
    userEmail,
    maskedEmail: maskInstitutionalEmail(userEmail),
    isAuthenticated: Boolean(token) && !isJwtExpired(token),
    isLoadingAuth,
    sessionAlert,
    clearSessionAlert: () => setSessionAlert(''),
    login,
    logout,
    verifySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un <AuthProvider>');
  }
  return context;
}

