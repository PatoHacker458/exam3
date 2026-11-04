import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login, isAuthenticated, sessionAlert, clearSessionAlert } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, destination]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    clearSessionAlert();

    const cleanEmail = email.trim();

    if (!cleanEmail && !password) {
      setErrorMessage('Por favor ingresa tu correo institucional y tu contraseña.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('El campo de correo electrónico institucional es obligatorio.');
      return;
    }

    if (!password) {
      setErrorMessage('El campo de contraseña es obligatorio.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      setErrorMessage(
        'Ingresa un correo electrónico institucional válido (ej. l21030000@celaya.tecnm.mx).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(cleanEmail, password);
      if (result.ok) {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(
          result.message || 'No fue posible validar tus credenciales en el SII.'
        );
      }
    } catch (_err) {
      setErrorMessage(
        'No fue posible establecer comunicación con el servicio escolar. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAlert = errorMessage || sessionAlert;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center relative overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Encabezado Institucional */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-xl shadow-emerald-950/60 border border-emerald-400/30 mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">
            Tecnológico Nacional de México en Celaya
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sistema Integral de Información
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Acceso al portal académico para estudiantes
          </p>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {activeAlert && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start gap-3 text-rose-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-300">Acceso no completado</p>
                <p className="text-rose-200/90 mt-0.5 leading-relaxed">{activeAlert}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="l22030000@celaya.tecnm.mx"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validando acceso...</span>
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Ingresa con tu cuenta oficial <span className="text-slate-300 font-mono">@celaya.tecnm.mx</span>
          </div>
        </div>
      </div>
    </div>
  );
}
