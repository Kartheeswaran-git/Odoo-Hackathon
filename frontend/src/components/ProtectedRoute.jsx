import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { authUser, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center bg-white text-sm text-slate-500">Checking your session…</div>;
  if (!authUser || !profile?.active) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
