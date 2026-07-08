import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { api, ApiError } from "../../api/client";
import {
  generarReporteVentasPdf,
  generarReporteIngresosPdf,
  generarReportePorPeliculaPdf,
  generarReportePorDiaPdf,
  generarReporteDashboardPdf,
} from "../../utils/dashboardReport";
import { AppShell, type MenuOption } from "../../components/AppShell";
import { IconTicket, IconFilm, IconHistory } from "../../components/icons";
import { BoletosSection } from "../cliente/BoletosSection";
import MagicBento from "../../components/MagicBento";
import CountUp from "../../components/CountUp";
import AnimatedList from "../../components/AnimatedList";
import AnimatedContent from "../../components/AnimatedContent";
import type { DashboardResumen, Funcion, Pelicula, Sala, VentaResumen } from "../../api/types";
import styles from "./Admin.module.css";

const SALAS_POR_DEFECTO: Sala[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  nombre: `Sala ${i + 1}`,
  capacidad: 20,
}));

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const IconDashboard = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <rect x="7" y="10" width="3" height="7" />
    <rect x="12" y="6" width="3" height="11" />
    <rect x="17" y="13" width="3" height="4" />
  </svg>
);
const IconVentas = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16v16l-2.5-1.5L15 20l-3-1.5L9 20l-2.5-1.5L4 20z" />
    <path d="M8 9h8M8 13h8" />
  </svg>
);

const IconAgregar = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const MENU: MenuOption[] = [
  { key: "dashboard", label: "Dashboard", icon: IconDashboard },
  { key: "ventas", label: "Ventas", icon: IconVentas },
  { key: "programacion", label: "Programación", icon: IconAgregar },
  { key: "catalogo", label: "Comprar boletos", icon: IconTicket },
  { key: "cartelera", label: "Cartelera", icon: IconFilm },
  { key: "historial", label: "Historial", icon: IconHistory },
];

const VISTAS_CLIENTE = ["catalogo", "cartelera", "historial"];

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export function Admin() {
  const [vista, setVista] = useState("dashboard");
  const [dashboard, setDashboard] = useState<DashboardResumen | null>(null);
  const [ventas, setVentas] = useState<VentaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [peliculas, setPeliculas] = useState<Pelicula[]>([]);

  const [modoPelicula, setModoPelicula] = useState<"existente" | "nueva">("existente");
  const [peliculaId, setPeliculaId] = useState<number | "">("");
  const [salaId, setSalaId] = useState<number | "">("");
  const [horario, setHorario] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaSinopsis, setNuevaSinopsis] = useState("");
  const [nuevaDuracion, setNuevaDuracion] = useState("100");
  const [nuevaClasificacion, setNuevaClasificacion] = useState("B");
  const [nuevoGenero, setNuevoGenero] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("85");
  const [nuevoPoster, setNuevoPoster] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reseteando, setReseteando] = useState(false);

  useEffect(() => {
    api.dashboard()
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el dashboard."));
  }, []);

  useEffect(() => {
    api.ventas()
      .then((res) => setVentas(res.ventas))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ventas."));
  }, []);

  function cargarProgramacion() {
    api.funciones().then((res) => setFunciones(res.funciones)).catch(() => {});
    api.peliculas().then((res) => setPeliculas(res.peliculas)).catch(() => {});
  }

  useEffect(() => {
    cargarProgramacion();
  }, []);

  // Películas del catálogo (de la BD) para el selector "película existente".
  const peliculasExistentes = peliculas;

  // Salas: se derivan de la cartelera real; si aún no carga, usa las 8 por defecto.
  const salasExistentes = useMemo(() => {
    const unicas = Array.from(new Map(funciones.map((f) => [f.sala.id, f.sala])).values());
    return unicas.length ? unicas.sort((a, b) => a.id - b.id) : SALAS_POR_DEFECTO;
  }, [funciones]);

  function resetFormularioPelicula() {
    setNuevoTitulo("");
    setNuevaSinopsis("");
    setNuevaDuracion("100");
    setNuevaClasificacion("B");
    setNuevoGenero("");
    setNuevoPrecio("85");
    setNuevoPoster("");
  }

  async function handleAgregarFuncion(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!horario) return setFormError("Selecciona fecha y hora de la función.");
    if (!salaId) return setFormError("Selecciona una sala.");
    if (modoPelicula === "existente" && !peliculaId) return setFormError("Selecciona una película.");
    if (modoPelicula === "nueva") {
      if (!nuevoTitulo.trim()) return setFormError("Ingresa el título de la película.");
      if (!nuevoGenero.trim()) return setFormError("Ingresa el género de la película.");
      if (!nuevoPrecio || Number(nuevoPrecio) <= 0) return setFormError("Ingresa un precio válido.");
    }

    setEnviando(true);
    try {
      // 1) Determina la película: si es nueva, se crea primero en la BD.
      let peliculaIdFinal: number;
      let tituloFinal: string;

      if (modoPelicula === "existente") {
        peliculaIdFinal = Number(peliculaId);
        tituloFinal = peliculasExistentes.find((p) => p.id === peliculaId)?.titulo ?? "la película";
      } else {
        const { pelicula } = await api.crearPelicula({
          titulo: nuevoTitulo.trim(),
          genero: nuevoGenero.trim(),
          duracion: Number(nuevaDuracion) || 100,
          precio: Number(nuevoPrecio),
          clasificacion: nuevaClasificacion || "B",
          sinopsis: nuevaSinopsis.trim() || null,
          poster_url: nuevoPoster.trim() || null,
        });
        peliculaIdFinal = pelicula.id;
        tituloFinal = pelicula.titulo;
      }

      // 2) Crea la función. El backend valida que no se empalme con otra
      //    de la misma sala (responde 409 con el detalle del choque).
      //    Se envía el horario tal cual (hora local, sin convertir a UTC).
      await api.crearFuncion(peliculaIdFinal, Number(salaId), horario);

      setFormSuccess(`Función de "${tituloFinal}" agregada a la cartelera.`);
      setHorario("");
      if (modoPelicula === "nueva") resetFormularioPelicula();
      cargarProgramacion();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo agregar la función.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleResetBD() {
    if (!confirm("¿Restablecer la base de datos a su estado inicial? Se borrarán las películas, funciones y ventas agregadas y se recargarán los datos de ejemplo.")) {
      return;
    }
    setReseteando(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await api.resetearBD();
      setFormSuccess("Base de datos restablecida a su estado inicial.");
      cargarProgramacion();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo restablecer la base de datos.");
    } finally {
      setReseteando(false);
    }
  }

  async function handleEliminarPelicula(pelicula: Pelicula) {
    if (!confirm(`¿Eliminar "${pelicula.titulo}"? Se borrarán también sus funciones. Solo se permite si no tiene boletos vendidos.`)) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    try {
      await api.eliminarPelicula(pelicula.id);
      setFormSuccess(`Película "${pelicula.titulo}" eliminada.`);
      cargarProgramacion();
    } catch (err) {
      // El backend responde 409 si la película ya tiene boletos vendidos.
      setFormError(err instanceof ApiError ? err.message : "No se pudo eliminar la película.");
    }
  }

  const indicadores = dashboard?.indicadores;
  const porPelicula = dashboard?.porPelicula ?? [];
  const porDia = [...(dashboard?.porDia ?? [])].reverse();

  return (
    <AppShell
      menu={MENU}
      active={vista}
      onSelect={setVista}
      hideHeader={vista === "catalogo"}
      title={
        vista === "dashboard" ? "Dashboard" :
        vista === "ventas" ? "Ventas" :
        vista === "programacion" ? "Programación" :
        vista === "cartelera" ? "Cartelera" :
        vista === "historial" ? "Historial de compras" :
        "Comprar boletos"
      }
      subtitle={
        vista === "dashboard" ? "Indicadores de operación en tiempo real." :
        vista === "ventas" ? "Historial completo de transacciones." :
        vista === "programacion" ? "Agrega funciones y horarios a la cartelera." :
        vista === "cartelera" ? "Pasa el cursor sobre una película y toca para ver sus horarios." :
        vista === "historial" ? "Consulta las compras registradas." :
        "Compra boletos a nombre de cualquier cliente."
      }
    >
      {vista === "dashboard" && error && <div className={styles.error}>{error}</div>}

      {vista === "dashboard" && dashboard && (
        <div className={styles.reportBar}>
          <button className={styles.reportBtnGhost} onClick={() => generarReporteVentasPdf(ventas ?? [])}>
            Reporte de ventas
          </button>
          <button className={styles.reportBtnGhost} onClick={() => generarReporteIngresosPdf(dashboard)}>
            Reporte de ingresos
          </button>
          <button className={styles.reportBtnGhost} onClick={() => generarReportePorPeliculaPdf(dashboard)}>
            Reporte por película
          </button>
          <button className={styles.reportBtnGhost} onClick={() => generarReportePorDiaPdf(dashboard)}>
            Reporte por día
          </button>
          <button className={styles.reportBtn} onClick={() => generarReporteDashboardPdf(dashboard, ventas ?? [])}>
            Reporte completo
          </button>
        </div>
      )}

      {VISTAS_CLIENTE.includes(vista) && <BoletosSection vista={vista} nombreEditable />}

      {vista === "dashboard" && indicadores && (
        <>
          <MagicBento
            glowColor="227, 178, 60"
            enableMagnetism
            clickEffect
            items={[
              {
                label: "Ventas totales",
                span: "hero",
                value: <>$<CountUp to={Number(indicadores.ventas_totales)} separator="," duration={1.2} /> MXN</>,
              },
              { label: "Boletos vendidos", value: <CountUp to={Number(indicadores.boletos_vendidos)} duration={1.2} /> },
              {
                label: "Descuentos otorgados",
                value: <>$<CountUp to={Number(indicadores.descuentos_aplicados)} separator="," duration={1.2} /> MXN</>,
              },
              {
                label: "Película más vendida",
                span: "wide",
                value: <span style={{ fontSize: 20 }}>{indicadores.pelicula_mas_vendida || "—"}</span>,
              },
              { label: "Clientes registrados", value: <CountUp to={Number(indicadores.total_clientes)} duration={1} /> },
              { label: "Compras con membresía", value: <CountUp to={Number(indicadores.compras_con_membresia)} duration={1} /> },
              { label: "Compras sin membresía", value: <CountUp to={Number(indicadores.compras_sin_membresia)} duration={1} /> },
            ]}
          />

          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h3>Ingresos por día</h3>
              <div className={styles.chartWrap}>
                <Bar
                  data={{
                    labels: porDia.length ? porDia.map((d) => d.dia.slice(5)) : ["Sin datos"],
                    datasets: [{
                      label: "Ingresos (MXN)",
                      data: porDia.length ? porDia.map((d) => Number(d.total_ingresos)) : [0],
                      backgroundColor: "#7d0f22",
                      borderRadius: 4,
                    }],
                  }}
                  options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3>Ingresos por película</h3>
              <div className={styles.chartWrap}>
                <Bar
                  data={{
                    labels: porPelicula.length ? porPelicula.map((p) => p.pelicula) : ["Sin datos"],
                    datasets: [{
                      label: "Ingresos (MXN)",
                      data: porPelicula.length ? porPelicula.map((p) => Number(p.ingresos_totales)) : [0],
                      backgroundColor: "#e3b23c",
                      borderRadius: 4,
                    }],
                  }}
                  options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
              </div>
            </div>
          </div>

          <AnimatedContent distance={40} duration={0.6} delay={0.1} threshold={0.05}>
            <div className={styles.chartsGrid}>
              <div className={styles.tableCard}>
                <h3>Resumen por película</h3>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Película</th><th>Boletos</th><th>Ingresos</th></tr>
                  </thead>
                  <tbody>
                    {porPelicula.length === 0 ? (
                      <tr><td colSpan={3} className={styles.empty}>Sin datos aún.</td></tr>
                    ) : (
                      porPelicula.map((fila) => (
                        <tr key={fila.pelicula_id}>
                          <td>{fila.pelicula}</td>
                          <td>{fila.boletos_vendidos}</td>
                          <td>{formatCurrency(Number(fila.ingresos_totales))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.tableCard}>
                <h3>Actividad reciente</h3>
                {!ventas || ventas.length === 0 ? (
                  <p className={styles.empty}>{ventas ? "Sin ventas registradas." : "Cargando…"}</p>
                ) : (
                  <AnimatedList
                    items={ventas.slice(0, 10)}
                    displayScrollbar={false}
                    renderItem={(venta) => (
                      <p className={styles.activityText}>
                        <strong>{venta.codigo}</strong> · {venta.funcion.pelicula.titulo} · {formatCurrency(Number(venta.total))}
                      </p>
                    )}
                  />
                )}
              </div>
            </div>
          </AnimatedContent>
        </>
      )}

      {vista === "ventas" && (
        <div className={styles.tableCard}>
          <h3>Historial de ventas</h3>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th><th>Cliente</th><th>Película</th><th>Sala</th>
                  <th>Boletos</th><th>Membresía</th><th>Total</th><th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {!ventas || ventas.length === 0 ? (
                  <tr><td colSpan={8} className={styles.empty}>{ventas ? "No existen ventas registradas." : "Cargando…"}</td></tr>
                ) : (
                  ventas.map((venta) => (
                    <tr key={venta.id}>
                      <td>{venta.codigo}</td>
                      <td>{venta.cliente_nombre}</td>
                      <td>{venta.funcion.pelicula.titulo}</td>
                      <td>{venta.funcion.sala.nombre}</td>
                      <td>{venta.cantidad}</td>
                      <td>{venta.con_membresia ? "Sí" : "No"}</td>
                      <td>{formatCurrency(Number(venta.total))}</td>
                      <td>{new Date(venta.fecha).toLocaleDateString("es-MX")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista === "programacion" && (
        <>
          <div className={styles.notice}>
            Las funciones se guardan en el servidor y quedan visibles y comprables para todos.
            El sistema valida que dos funciones de la misma sala no se empalmen (deja al menos
            15 min de separación entre ellas).
          </div>

          {formSuccess && <div className={styles.success}>{formSuccess}</div>}
          {formError && <div className={styles.error}>{formError}</div>}

          <div className={styles.tableCard}>
            <h3>Agregar función</h3>
            <form onSubmit={handleAgregarFuncion} className={styles.progForm}>
              <div className={styles.progToggle}>
                <button
                  type="button"
                  className={modoPelicula === "existente" ? styles.progToggleActive : styles.progToggleBtn}
                  onClick={() => setModoPelicula("existente")}
                >
                  Película existente
                </button>
                <button
                  type="button"
                  className={modoPelicula === "nueva" ? styles.progToggleActive : styles.progToggleBtn}
                  onClick={() => setModoPelicula("nueva")}
                >
                  Película nueva
                </button>
              </div>

              {modoPelicula === "existente" ? (
                <div className={styles.field}>
                  <label>Película</label>
                  <select value={peliculaId} onChange={(e) => setPeliculaId(Number(e.target.value))}>
                    <option value="">Selecciona una película…</option>
                    {peliculasExistentes.map((p) => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Título</label>
                    <input value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>Género</label>
                    <input value={nuevoGenero} onChange={(e) => setNuevoGenero(e.target.value)} placeholder="Acción, comedia…" />
                  </div>
                  <div className={styles.field}>
                    <label>Duración (min)</label>
                    <input type="number" min={1} value={nuevaDuracion} onChange={(e) => setNuevaDuracion(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>Clasificación</label>
                    <select value={nuevaClasificacion} onChange={(e) => setNuevaClasificacion(e.target.value)}>
                      {["A", "B", "B15", "C", "D"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Precio</label>
                    <input type="number" min={1} step="0.5" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
                  </div>
                  <div className={`${styles.field} ${styles.fieldWide}`}>
                    <label>Sinopsis</label>
                    <input value={nuevaSinopsis} onChange={(e) => setNuevaSinopsis(e.target.value)} />
                  </div>
                  <div className={`${styles.field} ${styles.fieldWide}`}>
                    <label>URL del póster (opcional)</label>
                    <input
                      value={nuevoPoster}
                      onChange={(e) => setNuevoPoster(e.target.value)}
                      placeholder="https://…  (si se deja vacío se usa un cartel genérico)"
                    />
                  </div>
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Sala</label>
                  <select value={salaId} onChange={(e) => setSalaId(Number(e.target.value))}>
                    <option value="">Selecciona una sala…</option>
                    {salasExistentes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Fecha y hora</label>
                  <input type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} />
                </div>
              </div>

              <button type="submit" className={styles.reportBtn} disabled={enviando}>
                {enviando ? "Agregando…" : "Agregar función"}
              </button>
            </form>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.cleanupHeader}>
              <div>
                <h3>Restablecer base de datos</h3>
                <p className={styles.cleanupHint}>
                  Vuelve la base de datos a su estado inicial: recarga el catálogo, las funciones
                  y las ventas de ejemplo, y elimina todo lo que se haya agregado. Úsalo para dejar la demo limpia.
                </p>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={handleResetBD}
                disabled={reseteando}
              >
                {reseteando ? "Restableciendo…" : "Restablecer BD"}
              </button>
            </div>
          </div>

          <div className={styles.tableCard}>
            <h3>Cartelera actual ({funciones.length})</h3>
            {funciones.length === 0 ? (
              <p className={styles.empty}>No hay funciones programadas.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Película</th><th>Sala</th><th>Horario</th><th>Precio</th></tr>
                  </thead>
                  <tbody>
                    {funciones.map((f) => (
                      <tr key={f.id}>
                        <td>{f.pelicula.titulo}</td>
                        <td>{f.sala.nombre}</td>
                        <td>{f.horario}</td>
                        <td>{formatCurrency(Number(f.pelicula.precio))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.tableCard}>
            <h3>Catálogo de películas ({peliculas.length})</h3>
            <p className={styles.cleanupHint}>
              Solo se pueden eliminar películas que no tengan boletos vendidos.
            </p>
            {peliculas.length === 0 ? (
              <p className={styles.empty}>No hay películas en el catálogo.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Película</th><th>Género</th><th>Duración</th><th>Precio</th><th></th></tr>
                  </thead>
                  <tbody>
                    {peliculas.map((p) => (
                      <tr key={p.id}>
                        <td>{p.titulo}</td>
                        <td>{p.genero}</td>
                        <td>{p.duracion} min</td>
                        <td>{formatCurrency(Number(p.precio))}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => handleEliminarPelicula(p)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
