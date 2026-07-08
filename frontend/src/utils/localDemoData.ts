import type { Asiento, Compra, Funcion, Pelicula, Sala } from "../api/types";

const FUNCIONES_KEY = "cinemax_funciones_locales";
const OCUPADOS_KEY = "cinemax_ocupados_locales";
const COMPRAS_KEY = "cinemax_compras_locales";
export const LOCAL_DATA_EVENT = "cinemax:local-data-updated";

function leer<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function escribir(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT));
}

export function onLocalDataChange(cb: () => void) {
  window.addEventListener(LOCAL_DATA_EVENT, cb);
  return () => window.removeEventListener(LOCAL_DATA_EVENT, cb);
}

export function limpiarDatosLocales() {
  const keysToRemove = Object.keys(localStorage).filter(
    (k) => k === FUNCIONES_KEY || k === COMPRAS_KEY || k.startsWith(`${OCUPADOS_KEY}:`)
  );
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT));
}

// ---- Funciones agregadas por el admin (solo frontend, no persisten en el backend real) ----

export function getFuncionesLocales(): Funcion[] {
  return leer<Funcion[]>(FUNCIONES_KEY, []);
}

export function agregarFuncionLocal(pelicula: Pelicula, sala: Sala, horario: string): Funcion {
  const funciones = getFuncionesLocales();
  const funcion: Funcion = {
    id: -(Date.now()),
    pelicula_id: pelicula.id,
    sala_id: sala.id,
    horario,
    pelicula,
    sala,
  };
  escribir(FUNCIONES_KEY, [...funciones, funcion]);
  return funcion;
}

export function eliminarFuncionLocal(id: number) {
  escribir(FUNCIONES_KEY, getFuncionesLocales().filter((f) => f.id !== id));
}

export function esFuncionLocal(id: number) {
  return id < 0;
}

// ---- Asientos simulados para funciones locales (4 filas x 5 columnas = 20) ----

export function generarAsientosLocales(funcionId: number): Asiento[] {
  const ocupados = new Set(leer<number[]>(`${OCUPADOS_KEY}:${funcionId}`, []));
  const filas = ["A", "B", "C", "D"];
  const asientos: Asiento[] = [];
  let asientoId = 1;
  for (const fila of filas) {
    for (let numero = 1; numero <= 5; numero++) {
      const id = asientoId++;
      asientos.push({
        asiento_id: id,
        codigo: `${fila}${numero}`,
        fila,
        numero,
        ocupado: ocupados.has(id) ? 1 : 0,
      });
    }
  }
  return asientos;
}

export function marcarAsientosOcupadosLocal(funcionId: number, asientoIds: number[]) {
  const key = `${OCUPADOS_KEY}:${funcionId}`;
  const actuales = new Set(leer<number[]>(key, []));
  asientoIds.forEach((id) => actuales.add(id));
  escribir(key, Array.from(actuales));
}

// ---- Compras simuladas para funciones locales ----

export function getComprasLocales(): Compra[] {
  return leer<Compra[]>(COMPRAS_KEY, []);
}

export function crearCompraLocal(
  funcion: Funcion,
  asientosSeleccionados: Asiento[],
  clienteNombre: string,
  conMembresia: boolean
): Compra {
  const precio = Number(funcion.pelicula.precio);
  const subtotal = asientosSeleccionados.length * precio;
  const descuento = conMembresia ? subtotal * 0.2 : 0;
  const total = subtotal - descuento;
  const codigo = `CMX-${Math.floor(1000 + Math.random() * 9000)}`;

  const compra: Compra = {
    id: -(Date.now()),
    codigo,
    usuario_id: 0,
    funcion_id: funcion.id,
    cliente_nombre: clienteNombre,
    cantidad: asientosSeleccionados.length,
    con_membresia: conMembresia,
    subtotal,
    descuento,
    total,
    fecha: new Date().toISOString(),
    funcion,
    boletos: asientosSeleccionados.map((a, i) => ({
      id: -(Date.now() + i),
      compra_id: -1,
      funcion_id: funcion.id,
      asiento_id: a.asiento_id,
      folio: `${codigo}-${i + 1}`,
      codigo_qr: codigo,
      asiento: { id: a.asiento_id, sala_id: funcion.sala_id, fila: a.fila, numero: a.numero, codigo: a.codigo },
    })),
  };

  escribir(COMPRAS_KEY, [compra, ...getComprasLocales()]);
  return compra;
}
