import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/integrations/supabase/client";

export function ProtectedRoute({ requireRole }: { requireRole?: AppRole }) {
  const { user, role, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const redirectTarget = `${loc.pathname}${loc.search}`;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  if (requireRole && role !== requireRole) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
