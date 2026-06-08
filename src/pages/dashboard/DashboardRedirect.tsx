import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === "admin") return <Navigate to="/dashboard/admin" replace />;
  if (role === "specialist") return <Navigate to="/dashboard/specialist" replace />;
  return <Navigate to="/dashboard/customer" replace />;
}
