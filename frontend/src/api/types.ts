export type Rol = "cliente" | "administrador";

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  membresia: boolean;
}

export interface Pelicula {
  id: number;
  titulo: string;
  sinopsis: string | null;
  duracion: number;
  clasificacion: string;
  genero: string;
  precio: string;
  poster_url: string | null;
  activa: boolean;
}

export interface Sala {
  id: number;
  nombre: string;
  capacidad: number;
}

export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  horario: string;
  pelicula: Pelicula;
  sala: Sala;
}

export interface Asiento {
  asiento_id: number;
  codigo: string;
  fila: string;
  numero: number;
  ocupado: 0 | 1;
}

export interface Boleto {
  id: number;
  compra_id: number;
  funcion_id: number;
  asiento_id: number;
  folio: string;
  codigo_qr: string;
  asiento: { id: number; sala_id: number; fila: string; numero: number; codigo: string };
}

export interface Compra {
  id: number;
  codigo: string;
  usuario_id: number;
  funcion_id: number;
  cliente_nombre: string;
  cantidad: number;
  con_membresia: boolean;
  subtotal: string | number;
  descuento: string | number;
  total: string | number;
  fecha: string;
  funcion: Funcion;
  boletos: Boleto[];
}

export interface VentaResumen {
  id: number;
  codigo: string;
  cliente_nombre: string;
  cantidad: number;
  con_membresia: boolean;
  subtotal: string | number;
  descuento: string | number;
  total: string | number;
  fecha: string;
  funcion: Funcion;
}

export interface Indicadores {
  ventas_totales: string | number;
  boletos_vendidos: string | number;
  descuentos_aplicados: string | number;
  total_clientes: string | number;
  compras_con_membresia: string | number;
  compras_sin_membresia: string | number;
  pelicula_mas_vendida: string | null;
}

export interface VentaPorPelicula {
  pelicula_id: number;
  pelicula: string;
  num_compras: string | number;
  boletos_vendidos: string | number;
  ingresos_totales: string | number;
}

export interface VentaPorSala {
  sala_id: number;
  sala: string;
  boletos_vendidos: string | number;
  ingresos_totales: string | number;
}

export interface VentaPorDia {
  dia: string;
  total_compras: string | number;
  total_boletos: string | number;
  total_ingresos: string | number;
  total_descuentos: string | number;
}

export interface DashboardResumen {
  indicadores: Indicadores;
  porPelicula: VentaPorPelicula[];
  porSala: VentaPorSala[];
  porDia: VentaPorDia[];
}
