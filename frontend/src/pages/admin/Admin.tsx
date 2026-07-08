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
import {
  getFuncionesLocales,
  agregarFuncionLocal,
  eliminarFuncionLocal,
  limpiarDatosLocales,
  onLocalDataChange,
} from "../../utils/localDemoData";
import { AppShell, type MenuOption } from "../../components/AppShell";
import MagicBento from "../../components/MagicBento";
import CountUp from "../../components/CountUp";
import AnimatedList from "../../components/AnimatedList";
import AnimatedContent from "../../components/AnimatedContent";
import type { DashboardResumen, Funcion, Pelicula, Sala, VentaResumen } from "../../api/types";
import styles from "./Admin.module.css";

const SALAS_POR_DEFECTO: Sala[] = [
  { id: 1, nombre: "Sala 1", capacidad: 20 },
  { id: 2, nombre: "Sala 2", capacidad: 20 },
  { id: 3, nombre: "Sala 3", capacidad: 20 },
  { id: 4, nombre: "Sala 4", capacidad: 20 },
  { id: 5, nombre: "Sala 5", capacidad: 20 },
];

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
];

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export function Admin() {
  const [vista, setVista] = useState("dashboard");
  const [dashboard, setDashboard] = useState<DashboardResumen | null>(null);
  const [ventas, setVentas] = useState<VentaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [funcionesLocales, setFuncionesLocales] = useState(getFuncionesLocales());

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
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    api.funciones().then((res) => setFunciones(res.funciones)).catch(() => {});
    return onLocalDataChange(() => setFuncionesLocales(getFuncionesLocales()));
  }, []);

  const peliculasExistentes = useMemo(
    () => Array.from(new Map(funciones.map((f) => [f.pelicula.id, f.pelicula])).values()),
    [funciones]
  );
  const salasExistentes = useMemo(() => {
    const unicas = Array.from(new Map(funciones.map((f) => [f.sala.id, f.sala])).values());
    return unicas.length ? unicas : SALAS_POR_DEFECTO;
  }, [funciones]);

  function resetFormularioPelicula() {
    setNuevoTitulo("");
    setNuevaSinopsis("");
    setNuevaDuracion("100");
    setNuevaClasificacion("B");
    setNuevoGenero("");
    setNuevoPrecio("85");
  }

  function handleAgregarFuncion(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!horario) return setFormError("Selecciona fecha y hora de la función.");
    if (!salaId) return setFormError("Selecciona una sala.");

    let peliculaFinal: Pelicula;
    if (modoPelicula === "existente") {
      const encontrada = peliculasExistentes.find((p) => p.id === peliculaId);
      if (!encontrada) return setFormError("Selecciona una película.");
      peliculaFinal = encontrada;
    } else {
      if (!nuevoTitulo.trim()) return setFormError("Ingresa el título de la película.");
      if (!nuevoPrecio || Number(nuevoPrecio) <= 0) return setFormError("Ingresa un precio válido.");
      peliculaFinal = {
        id: -Date.now(),
        titulo: nuevoTitulo.trim(),
        sinopsis: nuevaSinopsis.trim() || null,
        duracion: Number(nuevaDuracion) || 100,
        clasificacion: nuevaClasificacion || "B",
        genero: nuevoGenero.trim() || "General",
        precio: nuevoPrecio,
        activa: true,
      };
    }

    const sala = salasExistentes.find((s) => s.id === salaId)!;
    agregarFuncionLocal(peliculaFinal, sala, new Date(horario).toISOString());
    setFormSuccess(`Función de "${peliculaFinal.titulo}" agregada. Solo visible en este navegador.`);
    setHorario("");
    if (modoPelicula === "nueva") resetFormularioPelicula();
  }

  const indicadores = dashboard?.indicadores;
  const porPelicula = dashboard?.porPelicula ?? [];
  const porDia = [...(dashboard?.porDia ?? [])].reverse();

  return (
    <AppShell
      menu={MENU}
      active={vista}
      onSelect={setVista}
      title={vista === "dashboard" ? "Dashboard" : vista === "ventas" ? "Ventas" : "Programación"}
      subtitle={
        vista === "dashboard" ? "Indicadores de operación en tiempo real." :
        vista === "ventas" ? "Historial completo de transacciones." :
        "Agrega funciones y horarios a la cartelera."
      }
    >
      {error && <div className={styles.error}>{error}</div>}

      {dashboard && (
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
            Estas funciones solo se guardan en este navegador (no en el servidor real). Para que sean
            visibles y comprables para todos, tu compañero de backend debe agregar endpoints
            <code> POST /api/admin/peliculas</code> y <code>POST /api/admin/funciones</code>.
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

              <button type="submit" className={styles.reportBtn}>Agregar función</button>
            </form>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.cleanupHeader}>
              <div>
                <h3>Limpiar datos de prueba</h3>
                <p className={styles.cleanupHint}>
                  Borra las funciones, compras y asientos ocupados que solo existen en este navegador (no afecta las ventas reales del servidor).
                </p>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => {
                  if (confirm("¿Borrar todas las funciones y compras de prueba guardadas en este navegador?")) {
                    limpiarDatosLocales();
                    setFormSuccess("Datos de prueba eliminados.");
                    setFormError(null);
                  }
                }}
              >
                Limpiar compras de prueba
              </button>
            </div>
          </div>

          <div className={styles.tableCard}>
            <h3>Funciones agregadas localmente ({funcionesLocales.length})</h3>
            {funcionesLocales.length === 0 ? (
              <p className={styles.empty}>Aún no has agregado funciones.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Película</th><th>Sala</th><th>Horario</th><th>Precio</th><th></th></tr>
                  </thead>
                  <tbody>
                    {funcionesLocales.map((f) => (
                      <tr key={f.id}>
                        <td>{f.pelicula.titulo}</td>
                        <td>{f.sala.nombre}</td>
                        <td>{new Date(f.horario).toLocaleString("es-MX")}</td>
                        <td>{formatCurrency(Number(f.pelicula.precio))}</td>
                        <td>
                          <button type="button" className={styles.removeBtn} onClick={() => eliminarFuncionLocal(f.id)}>
                            Quitar
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
