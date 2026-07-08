import type {
  Usuario,
  Pelicula,
  Funcion,
  Asiento,
  Compra,
  VentaResumen,
  DashboardResumen,
} from "./types";

export interface NuevaPeliculaInput {
  titulo: string;
  genero: string;
  duracion: number;
  precio: number;
  clasificacion?: string;
  sinopsis?: string | null;
  poster_url?: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Inténtalo de nuevo en unos momentos.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new ApiError(data.mensaje || `Error ${res.status}`);
  }
  return data as T;
}

export const api = {
  login: (correo: string, password: string) =>
    request<{ usuario: Usuario; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, password }),
    }),

  registrar: (nombre: string, correo: string, password: string) =>
    request<{ usuario: Usuario; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ nombre, correo, password }),
    }),

  peliculas: () => request<{ peliculas: Pelicula[] }>("/peliculas"),

  funciones: () => request<{ funciones: Funcion[] }>("/funciones"),

  asientos: (funcionId: number) =>
    request<{ asientos: Asiento[] }>(`/funciones/${funcionId}/asientos`),

  crearCompra: (funcion_id: number, asientos: number[], cliente_nombre: string) =>
    request<{ compra: Compra }>("/compras", {
      method: "POST",
      body: JSON.stringify({ funcion_id, asientos, cliente_nombre }),
    }),

  misCompras: () => request<{ compras: Compra[] }>("/compras/mias"),

  dashboard: () => request<DashboardResumen>("/admin/dashboard"),

  ventas: () => request<{ ventas: VentaResumen[] }>("/admin/ventas"),

  // ── Admin: alta de catálogo y mantenimiento ──────────────
  crearPelicula: (datos: NuevaPeliculaInput) =>
    request<{ pelicula: Pelicula }>("/admin/peliculas", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  crearFuncion: (pelicula_id: number, sala_id: number, horario: string) =>
    request<{ funcion: Funcion }>("/admin/funciones", {
      method: "POST",
      body: JSON.stringify({ pelicula_id, sala_id, horario }),
    }),

  eliminarPelicula: (id: number) =>
    request<{ ok: true; mensaje: string; id: number }>(`/admin/peliculas/${id}`, {
      method: "DELETE",
    }),

  resetearBD: () =>
    request<{ ok: true; mensaje: string }>("/admin/reset", { method: "POST" }),
};
