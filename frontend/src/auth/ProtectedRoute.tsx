import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Rol } from "../api/types";

export function ProtectedRoute({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { usuario, token } = useAuth();

  if (!token || !usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== rol) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
