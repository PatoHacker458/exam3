import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth, verifySession } = useAuth();
  const location = useLocation();

  useEffect(() => {
    verifySession();
  }, [location.pathname, verifySession]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#e6e6e6] flex flex-col items-center justify-center p-6 text-zinc-900">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-600/30 border-t-emerald-700 animate-spin mb-4" />
        <p className="text-zinc-700 text-sm font-bold">
          Verificando sesión institucional SII ITC...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}