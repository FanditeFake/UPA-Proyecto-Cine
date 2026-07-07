import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Usuario } from "../api/types";

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  iniciarSesion: (usuario: Usuario, token: string) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function leerUsuarioGuardado(): Usuario | null {
  try {
    const raw = localStorage.getItem("usuario");
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuarioGuardado);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  const value = useMemo<AuthState>(
    () => ({
      usuario,
      token,
      iniciarSesion: (u, t) => {
        localStorage.setItem("usuario", JSON.stringify(u));
        localStorage.setItem("token", t);
        setUsuario(u);
        setToken(t);
      },
      cerrarSesion: () => {
        localStorage.removeItem("usuario");
        localStorage.removeItem("token");
        setUsuario(null);
        setToken(null);
      },
    }),
    [usuario, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
