import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Role } from "@/lib/auth";
import { LoadingScreen } from "./LoadingScreen";

export function RequireAuth({ role }: { role?: Role }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <LoadingScreen label="Checking your session" />;
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (role && user.role !== role) {
    return (
      <Navigate to={user.role === "teacher" ? "/teacher" : "/dashboard"} replace />
    );
  }
  return <Outlet />;
}
