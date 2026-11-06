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
    <div className="min-h-screen bg-[#e6e6e6] text-zinc-900 flex flex-col justify-center relative overflow-hidden px-4 py-12">
      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Encabezado Institucional */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-700 shadow-sm border border-emerald-800 mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-1">
            Tecnológico Nacional de México en Celaya
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
            Sistema Integral de Información
          </h1>
          <p className="text-sm text-zinc-600 font-medium mt-1.5">
            Acceso al portal académico para estudiantes
          </p>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="rounded-2xl bg-white border border-zinc-300 shadow-sm p-6 sm:p-8">
          {activeAlert && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-rose-50 border border-rose-300 p-4 flex items-start gap-3 text-rose-900 text-sm shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-800">Acceso no completado</p>
                <p className="text-rose-700 mt-0.5 leading-relaxed font-medium">{activeAlert}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2"
              >
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-500 font-medium text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-500 font-medium text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-700 cursor-pointer transition-colors"
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
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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

          <div className="mt-6 pt-5 border-t border-zinc-200 text-center text-xs text-zinc-600 font-medium">
            Ingresa con tu cuenta oficial <span className="text-zinc-800 font-mono font-bold">@celaya.tecnm.mx</span>
          </div>
        </div>
      </div>
    </div>
  );
}