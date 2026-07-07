import { useEffect, useState, type ReactNode } from "react";
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
import { generarReporteDashboardPdf } from "../../utils/dashboardReport";
import { AppShell, type MenuOption } from "../../components/AppShell";
import { BorderGlow } from "../../components/BorderGlow";
import CountUp from "../../components/CountUp";
import AnimatedList from "../../components/AnimatedList";
import AnimatedContent from "../../components/AnimatedContent";
import type { DashboardResumen, VentaResumen } from "../../api/types";
import styles from "./Admin.module.css";

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

const MENU: MenuOption[] = [
  { key: "dashboard", label: "Dashboard", icon: IconDashboard },
  { key: "ventas", label: "Ventas", icon: IconVentas },
];

const STAT_GLOW_COLORS = ["#e3b23c", "#7d0f22", "#f0d48a"];

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <BorderGlow
      className={styles.statGlow}
      backgroundColor="var(--paper)"
      borderRadius={10}
      glowColor="43 70 55"
      colors={STAT_GLOW_COLORS}
      glowIntensity={0.8}
      glowRadius={16}
      edgeSensitivity={40}
      coneSpread={35}
    >
      <div className={styles.statCard}>
        <span className={styles.statLabel}>{label}</span>
        <strong>{value}</strong>
      </div>
    </BorderGlow>
  );
}

export function Admin() {
  const [vista, setVista] = useState("dashboard");
  const [dashboard, setDashboard] = useState<DashboardResumen | null>(null);
  const [ventas, setVentas] = useState<VentaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const indicadores = dashboard?.indicadores;
  const porPelicula = dashboard?.porPelicula ?? [];
  const porDia = [...(dashboard?.porDia ?? [])].reverse();

  return (
    <AppShell
      menu={MENU}
      active={vista}
      onSelect={setVista}
      title={vista === "dashboard" ? "Dashboard" : "Ventas"}
      subtitle={vista === "dashboard" ? "Indicadores de operación en tiempo real." : "Historial completo de transacciones."}
    >
      {error && <div className={styles.error}>{error}</div>}

      {dashboard && (
        <div className={styles.reportBar}>
          <button
            className={styles.reportBtn}
            onClick={() => generarReporteDashboardPdf(dashboard, ventas ?? [])}
          >
            Descargar reporte PDF
          </button>
        </div>
      )}

      {vista === "dashboard" && indicadores && (
        <>
          <div className={styles.statsGrid}>
            <StatCard
              label="Ventas totales"
              value={<>$<CountUp to={Number(indicadores.ventas_totales)} separator="," duration={1.2} /> MXN</>}
            />
            <StatCard label="Boletos vendidos" value={<CountUp to={Number(indicadores.boletos_vendidos)} duration={1.2} />} />
            <StatCard label="Película más vendida" value={<span style={{ fontSize: 18 }}>{indicadores.pelicula_mas_vendida || "—"}</span>} />
            <StatCard
              label="Descuentos otorgados"
              value={<>$<CountUp to={Number(indicadores.descuentos_aplicados)} separator="," duration={1.2} /> MXN</>}
            />
            <StatCard label="Clientes registrados" value={<CountUp to={Number(indicadores.total_clientes)} duration={1} />} />
            <StatCard label="Compras con membresía" value={<CountUp to={Number(indicadores.compras_con_membresia)} duration={1} />} />
            <StatCard label="Compras sin membresía" value={<CountUp to={Number(indicadores.compras_sin_membresia)} duration={1} />} />
          </div>

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
      )}
    </AppShell>
  );
}
