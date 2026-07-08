import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import FlowingMenu from "../../components/FlowingMenu";
import AnimatedList from "../../components/AnimatedList";
import Folder from "../../components/Folder";
import CircularGallery from "../../components/CircularGallery";
import LightRays from "../../components/LightRays";
import RotatingText from "../../components/RotatingText";
import { IconClose } from "../../components/icons";
import { posterDataUri } from "../../utils/poster";
import { qrToDataUrl } from "../../utils/qrToDataUrl";
import {
  getFuncionesLocales,
  getComprasLocales,
  generarAsientosLocales,
  marcarAsientosOcupadosLocal,
  crearCompraLocal,
  esFuncionLocal,
  onLocalDataChange,
} from "../../utils/localDemoData";
import type { Asiento, Compra, Funcion, Pelicula } from "../../api/types";
import styles from "./Cliente.module.css";

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function formatHorario(value: string) {
  return new Date(value).toLocaleString("es-MX", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function qrValueBoleto(c: Compra) {
  return `Código: ${c.codigo}\nCliente: ${c.cliente_nombre}\nPelícula: ${c.funcion.pelicula.titulo}\nAsientos: ${c.boletos.map((b) => b.asiento.codigo).join(", ")}\nTotal: ${formatCurrency(Number(c.total))}`;
}

interface BoletosSectionProps {
  vista: string;
  /** Si es false (cliente), el nombre de quien compra queda fijo al usuario logueado. Si es true (admin), se puede editar libremente. */
  nombreEditable: boolean;
}

export function BoletosSection({ vista, nombreEditable }: BoletosSectionProps) {
  const { usuario } = useAuth();
  const [boletoAbierto, setBoletoAbierto] = useState(false);
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [funcionesError, setFuncionesError] = useState<string | null>(null);
  const [funcionSeleccionada, setFuncionSeleccionada] = useState<Funcion | null>(null);
  const [pasoCompra, setPasoCompra] = useState<"asientos" | "resumen" | "pago">("asientos");
  const [peliculaHorarios, setPeliculaHorarios] = useState<Pelicula | null>(null);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [cantidad, setCantidad] = useState(1);
  const [nombreCliente, setNombreCliente] = useState(usuario?.nombre ?? "");
  const [titular, setTitular] = useState(usuario?.nombre ?? "");
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [misCompras, setMisCompras] = useState<Compra[] | null>(null);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [boletoSeleccionado, setBoletoSeleccionado] = useState<Compra | null>(null);

  useEffect(() => {
    if (!nombreEditable) setNombreCliente(usuario?.nombre ?? "");
  }, [nombreEditable, usuario?.nombre]);

  useEffect(() => {
    function cargarFunciones() {
      api.funciones()
        .then((res) => setFunciones([...res.funciones, ...getFuncionesLocales()]))
        .catch((err) => setFuncionesError(err instanceof ApiError ? err.message : "No se pudieron cargar las funciones."));
    }
    cargarFunciones();
    return onLocalDataChange(cargarFunciones);
  }, []);

  function poster(pelicula: Pelicula) {
    // Usa el póster real guardado en la BD; si no tiene (películas ficticias),
    // genera un cartel placeholder con la marca CineMax.
    return pelicula.poster_url || posterDataUri(pelicula.titulo, pelicula.id);
  }

  useEffect(() => {
    if (!misCompras) {
      api.misCompras()
        .then((res) => setMisCompras([...getComprasLocales(), ...res.compras]))
        .catch((err) => setHistorialError(err instanceof ApiError ? err.message : "No se pudo cargar tu historial."));
    }
  }, [misCompras]);

  const peliculasUnicas = useMemo(
    () => Array.from(new Map(funciones.map((f) => [f.pelicula.id, f.pelicula])).values()),
    [funciones]
  );

  const circularItems = useMemo(
    () => peliculasUnicas.map((p) => ({ image: poster(p), text: p.titulo })),
    [peliculasUnicas]
  );

  const flowingItems = useMemo(
    () =>
      peliculasUnicas.map((p) => ({
        text: p.titulo,
        image: poster(p),
        onClick: () => setPeliculaHorarios(p),
      })),
    [peliculasUnicas]
  );

  const horariosDePelicula = peliculaHorarios ? funciones.filter((f) => f.pelicula.id === peliculaHorarios.id) : [];

  async function elegirFuncion(funcion: Funcion) {
    setPeliculaHorarios(null);
    setFuncionSeleccionada(funcion);
    setSeleccionados([]);
    setPayError(null);
    setPasoCompra("asientos");
    if (esFuncionLocal(funcion.id)) {
      setAsientos(generarAsientosLocales(funcion.id));
      return;
    }
    try {
      const { asientos } = await api.asientos(funcion.id);
      setAsientos(asientos);
    } catch (err) {
      setFuncionesError(err instanceof ApiError ? err.message : "No se pudieron cargar los asientos.");
    }
  }

  function cerrarCompra() {
    setFuncionSeleccionada(null);
    setSeleccionados([]);
    setPayError(null);
    setPasoCompra("asientos");
  }

  async function refrescarAsientos(funcion: Funcion) {
    if (esFuncionLocal(funcion.id)) {
      setAsientos(generarAsientosLocales(funcion.id));
      return;
    }
    const { asientos } = await api.asientos(funcion.id);
    setAsientos(asientos);
  }

  function toggleAsiento(id: number) {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= cantidad) return prev;
      return [...prev, id];
    });
  }

  const precio = funcionSeleccionada ? Number(funcionSeleccionada.pelicula.precio) : 0;
  const subtotal = seleccionados.length * precio;
  const descuento = usuario?.membresia ? subtotal * 0.2 : 0;
  const total = subtotal - descuento;
  const disponibles = asientos.filter((a) => !a.ocupado).length;

  function abrirBoleto(c: Compra) {
    setBoletoSeleccionado(c);
    setBoletoAbierto(true);
  }

  async function pagar() {
    setPayError(null);
    if (!funcionSeleccionada) return setPayError("Selecciona una función.");
    if (!nombreCliente.trim()) return setPayError("Ingresa el nombre del cliente.");
    if (seleccionados.length !== cantidad) return setPayError("Selecciona la cantidad exacta de asientos.");
    if (!titular.trim()) return setPayError("Ingresa el nombre del titular.");
    if (!/^\d{16}$/.test(numeroTarjeta)) return setPayError("La tarjeta debe tener 16 dígitos.");
    if (!/^\d{2}\/\d{2}$/.test(vencimiento)) return setPayError("La fecha debe tener formato MM/AA.");
    if (!/^\d{3}$/.test(cvv)) return setPayError("El CVV debe tener 3 dígitos.");

    setPagando(true);
    try {
      let compraFinal: Compra;
      if (esFuncionLocal(funcionSeleccionada.id)) {
        const asientosElegidos = asientos.filter((a) => seleccionados.includes(a.asiento_id));
        compraFinal = crearCompraLocal(funcionSeleccionada, asientosElegidos, nombreCliente.trim(), !!usuario?.membresia);
        marcarAsientosOcupadosLocal(funcionSeleccionada.id, seleccionados);
      } else {
        const { compra } = await api.crearCompra(funcionSeleccionada.id, seleccionados, nombreCliente.trim());
        compraFinal = compra;
      }
      setMisCompras((prev) => [compraFinal, ...(prev ?? [])]);
      setSeleccionados([]);
      await refrescarAsientos(funcionSeleccionada);
      setFuncionSeleccionada(null);
      abrirBoleto(compraFinal);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "No se pudo procesar el pago.");
    } finally {
      setPagando(false);
    }
  }

  async function descargarPdf(compra: Compra) {
    const asientosTexto = compra.boletos.map((b) => b.asiento.codigo).join(", ");
    const qrDataUrl = await qrToDataUrl(`CineMax\n${qrValueBoleto(compra)}`, 300);

    const VELVET: [number, number, number] = [125, 15, 34];
    const GOLD: [number, number, number] = [227, 178, 60];
    const GOLD_SOFT: [number, number, number] = [240, 212, 138];
    const INK: [number, number, number] = [28, 21, 18];
    const MUTED: [number, number, number] = [138, 123, 108];
    const LINE: [number, number, number] = [221, 208, 184];
    const PAPER: [number, number, number] = [255, 253, 248];

    const doc = new jsPDF();
    const cardX = 15;
    const cardY = 20;
    const cardW = 180;
    const cardH = 150;
    const headerH = 28;

    doc.setFillColor(...PAPER);
    doc.setDrawColor(...LINE);
    doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, "FD");

    doc.setFillColor(...VELVET);
    doc.rect(cardX, cardY, cardW, headerH, "F");
    doc.setTextColor(...GOLD_SOFT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("CINEMAX", cardX + 10, cardY + 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("BOLETO DIGITAL", cardX + 10, cardY + 21);

    doc.setFillColor(...GOLD);
    doc.roundedRect(cardX + cardW - 55, cardY + 8, 45, 12, 2, 2, "F");
    doc.setTextColor(...VELVET);
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(compra.codigo, cardX + cardW - 32.5, cardY + 15.5, { align: "center" });

    const bodyY = cardY + headerH + 14;
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(compra.funcion.pelicula.titulo, cardX + 10, bodyY);

    const fields: [string, string][] = [
      ["Cliente", compra.cliente_nombre],
      ["Sala", compra.funcion.sala.nombre],
      ["Horario", new Date(compra.funcion.horario).toLocaleString("es-MX")],
      ["Asientos", asientosTexto],
      ["Boletos", String(compra.cantidad)],
    ];

    let fieldY = bodyY + 12;
    for (const [label, value] of fields) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(label.toUpperCase(), cardX + 10, fieldY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...INK);
      doc.text(value, cardX + 10, fieldY + 6);
      fieldY += 15;
    }

    const qrSize = 46;
    const qrX = cardX + cardW - qrSize - 14;
    const qrY = bodyY - 2;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Escanea en taquilla", qrX + qrSize / 2, qrY + qrSize + 6, { align: "center" });

    const perfY = cardY + cardH - 26;
    doc.setDrawColor(...LINE);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(cardX + 8, perfY, cardX + cardW - 8, perfY);
    doc.setLineDashPattern([], 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Total pagado", cardX + 10, perfY + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...VELVET);
    doc.text(formatCurrency(Number(compra.total)), cardX + 10, perfY + 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Presenta este boleto (impreso o digital) en la entrada de la sala.", cardX + cardW - 10, perfY + 21, { align: "right" });

    doc.save(`boleto-${compra.codigo}.pdf`);
  }

  return (
    <>
      {vista === "catalogo" && (
        <div className={styles.catalogoPage}>
          <div className={styles.galleryStage}>
            <LightRays
              raysOrigin="top-center"
              raysColor="#e3b23c"
              raysSpeed={1.1}
              lightSpread={0.7}
              rayLength={1.4}
              fadeDistance={1.1}
              saturation={0.9}
              followMouse
              mouseInfluence={0.12}
              noiseAmount={0.06}
              distortion={0.03}
            />
            <div className={styles.galleryTagline}>
              <span>Cartelera de</span>
              <RotatingText
                texts={["Estrenos", "Compras Online", "Estrenos", "Sin filas"]}
                mainClassName={styles.rotatingWord}
                staggerFrom="last"
                staggerDuration={0.02}
                rotationInterval={2400}
              />
            </div>
            {funcionesError && <div className={styles.error}>{funcionesError}</div>}
            {circularItems.length === 0 ? (
              <div className={styles.empty}>
                <h3>Cargando cartelera...</h3>
              </div>
            ) : (
              <CircularGallery
                items={circularItems}
                bend={2.4}
                textColor="#f0d48a"
                borderRadius={0.06}
                scrollSpeed={1.8}
                onItemClick={(i) => setPeliculaHorarios(peliculasUnicas[i])}
              />
            )}
          </div>

          {funciones.length > 0 && (
            <div className={styles.catalogoListWrap}>
              <h3 className={styles.rowTitle}>Cartelera</h3>
              <div className={styles.grid}>
                {funciones.map((funcion) => (
                  <div key={funcion.id} className={styles.movie} onClick={() => elegirFuncion(funcion)}>
                    <div className={styles.poster}>
                      <img src={poster(funcion.pelicula)} alt={funcion.pelicula.titulo} />
                      <span className={styles.posterPrice}>{formatCurrency(Number(funcion.pelicula.precio))}</span>
                    </div>
                    <h3 className={styles.movieTitle}>{funcion.pelicula.titulo}</h3>
                    <div className={styles.meta}>
                      <span>{funcion.sala.nombre}</span>
                      <span>{formatHorario(funcion.horario)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {vista === "cartelera" && (
        <div className={styles.flowingStage}>
          {flowingItems.length === 0 ? (
            <div className={styles.empty}>
              <h3>Cargando cartelera...</h3>
            </div>
          ) : (
            <FlowingMenu items={flowingItems} bgColor="#14100e" marqueeBgColor="#e3b23c" marqueeTextColor="#14100e" borderColor="rgba(240,212,138,0.25)" speed={18} />
          )}
        </div>
      )}

      {vista === "historial" && (
        <div className={styles.historyPanel}>
          {historialError && <div className={styles.error}>{historialError}</div>}

          {!misCompras ? (
            <p className={styles.loadingText}>Cargando historial...</p>
          ) : misCompras.length === 0 ? (
            <div className={styles.empty}>
              <h3>Aún no tienes compras</h3>
              <p>Tus boletos comprados aparecerán aquí.</p>
            </div>
          ) : (
            <AnimatedList
              items={misCompras}
              displayScrollbar={false}
              onItemSelect={(item) => abrirBoleto(item)}
              renderItem={(item) => (
                <article className={styles.historyItem}>
                  <img src={poster(item.funcion.pelicula)} alt="" />
                  <div>
                    <strong>{item.funcion.pelicula.titulo}</strong>
                    <span>{item.codigo} · {item.funcion.sala.nombre}</span>
                    <span>{new Date(item.fecha).toLocaleDateString("es-MX")} · {item.cantidad} boletos</span>
                  </div>
                  <b>{formatCurrency(Number(item.total))}</b>
                </article>
              )}
            />
          )}
        </div>
      )}

      {/* Horarios disponibles de la película elegida en la Cartelera */}
      <AnimatePresence>
        {peliculaHorarios && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPeliculaHorarios(null)}
          >
            <motion.div
              className={styles.horariosModal}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.modalClose} onClick={() => setPeliculaHorarios(null)} aria-label="Cerrar">
                {IconClose}
              </button>
              <h3>{peliculaHorarios.titulo}</h3>
              <p className={styles.horariosSubtitle}>{peliculaHorarios.sinopsis}</p>
              <h4 className={styles.compactTitle}>Horarios disponibles</h4>
              <div className={styles.horariosList}>
                {horariosDePelicula.map((f) => (
                  <button key={f.id} className={styles.horarioBtn} onClick={() => elegirFuncion(f)}>
                    <span>{formatHorario(f.horario)}</span>
                    <span>{f.sala.nombre}</span>
                    <b>{formatCurrency(Number(f.pelicula.precio))}</b>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de compra: función + asientos + pago */}
      <AnimatePresence>
        {funcionSeleccionada && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarCompra}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.modalClose} onClick={cerrarCompra} aria-label="Cerrar">
                {IconClose}
              </button>

              <div className={styles.modalGrid}>
                <div className={styles.purchaseMain}>
                  <div className={styles.stepTabs}>
                    <span className={pasoCompra === "asientos" ? styles.stepTabActive : styles.stepTab}>1. Asientos</span>
                    <span className={pasoCompra === "resumen" ? styles.stepTabActive : styles.stepTab}>2. Resumen</span>
                    <span className={pasoCompra === "pago" ? styles.stepTabActive : styles.stepTab}>3. Pago</span>
                  </div>

                  {pasoCompra === "asientos" && (
                    <div className={styles.stepCard}>
                      <h3 className={styles.sectionTitle}>Elige tus asientos</h3>
                      <div className={styles.formRow}>
                        <div className={styles.field}>
                          <label>Nombre del cliente</label>
                          <input
                            value={nombreCliente}
                            disabled={!nombreEditable}
                            onChange={(e) => setNombreCliente(e.target.value)}
                          />
                        </div>
                        <div className={styles.field}>
                          <label>Cantidad de boletos</label>
                          <select
                            value={cantidad}
                            onChange={(e) => { setCantidad(Number(e.target.value)); setSeleccionados([]); }}
                          >
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className={styles.screen}>PANTALLA</div>
                      <div className={styles.seatMap}>
                        {asientos.map((asiento) => (
                          <motion.button
                            key={asiento.asiento_id}
                            className={`${styles.seat} ${asiento.ocupado ? styles.seatOccupied : ""} ${
                              seleccionados.includes(asiento.asiento_id) ? styles.seatSelected : ""
                            }`}
                            disabled={!!asiento.ocupado}
                            onClick={() => toggleAsiento(asiento.asiento_id)}
                            whileTap={{ scale: 0.92 }}
                          >
                            {asiento.codigo}
                          </motion.button>
                        ))}
                      </div>

                      <div className={styles.seatLegend}>
                        <span><i className={styles.legendFree} /> Disponible</span>
                        <span><i className={styles.legendSel} /> Seleccionado</span>
                        <span><i className={styles.legendOcc} /> Ocupado</span>
                      </div>

                      <button
                        className={styles.payBtn}
                        disabled={seleccionados.length !== cantidad || !nombreCliente.trim()}
                        onClick={() => setPasoCompra("resumen")}
                      >
                        Continuar
                      </button>
                    </div>
                  )}

                  {pasoCompra === "resumen" && (
                    <div className={styles.stepCard}>
                      <h3 className={styles.sectionTitle}>Resumen de tu compra</h3>
                      <div className={styles.membershipBox}>
                        <div>
                          <strong>Membresía</strong>
                          <p>El 20% de descuento se aplica automáticamente según tu cuenta.</p>
                        </div>
                        <span className={`${styles.badge} ${usuario?.membresia ? styles.badgeOn : styles.badgeOff}`}>
                          {usuario?.membresia ? "Activa" : "Sin membresía"}
                        </span>
                      </div>

                      <div className={styles.cartSeatList}>
                        {seleccionados.map((id) => {
                          const asiento = asientos.find((a) => a.asiento_id === id);
                          return (
                            <div key={id} className={styles.cartSeatItem}>
                              <span>Admisión general · Asiento {asiento?.codigo}</span>
                              <strong>{formatCurrency(precio)}</strong>
                            </div>
                          );
                        })}
                      </div>

                      <div className={styles.totalsBox}>
                        <div className={styles.totalsRow}><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
                        <div className={styles.totalsRow}><span>Descuento</span><strong>{formatCurrency(descuento)}</strong></div>
                        <div className={`${styles.totalsRow} ${styles.totalFinal}`}><span>Total</span><strong>{formatCurrency(total)}</strong></div>
                      </div>

                      <div className={styles.stepActions}>
                        <button className={styles.stepBackBtn} onClick={() => setPasoCompra("asientos")}>Editar asientos</button>
                        <button className={styles.payBtn} onClick={() => setPasoCompra("pago")}>Continuar a pago</button>
                      </div>
                    </div>
                  )}

                  {pasoCompra === "pago" && (
                    <div className={styles.stepCard}>
                      <h3 className={styles.sectionTitle}>Datos personales y pago</h3>
                      <div className={styles.formRow}>
                        <div className={styles.field}>
                          <label>Titular</label>
                          <input value={titular} onChange={(e) => setTitular(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                          <label>Número de tarjeta</label>
                          <input value={numeroTarjeta} maxLength={16} onChange={(e) => setNumeroTarjeta(e.target.value.replace(/\D/g, ""))} />
                        </div>
                        <div className={styles.field}>
                          <label>Vencimiento (MM/AA)</label>
                          <input value={vencimiento} maxLength={5} onChange={(e) => setVencimiento(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                          <label>CVV</label>
                          <input value={cvv} maxLength={3} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} />
                        </div>
                      </div>

                      {payError && <div className={styles.error}>{payError}</div>}

                      <div className={styles.stepActions}>
                        <button className={styles.stepBackBtn} onClick={() => setPasoCompra("resumen")}>Volver</button>
                        <button className={styles.payBtn} onClick={pagar} disabled={pagando}>
                          {pagando ? "Procesando pago..." : "Confirmar pago y generar boleto"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <aside className={styles.cartSidebar}>
                  <div className={styles.cartHeader}>
                    <span>Tu carrito</span>
                    <strong>{formatCurrency(total)}</strong>
                  </div>
                  <div className={styles.cartBody}>
                    <img src={poster(funcionSeleccionada.pelicula)} alt="" className={styles.cartPoster} />
                    <div>
                      <strong>{funcionSeleccionada.pelicula.titulo}</strong>
                      <p className={styles.cartMeta}>{funcionSeleccionada.sala.nombre}</p>
                      <p className={styles.cartMeta}>{new Date(funcionSeleccionada.horario).toLocaleString("es-MX")}</p>
                    </div>
                  </div>
                  <p className={styles.availability}>{disponibles} asientos disponibles de {asientos.length}</p>
                  <p className={styles.cartMeta}>Asientos ({seleccionados.length}/{cantidad})</p>
                  <p className={styles.cartMeta}>
                    {seleccionados.length === 0
                      ? "No has seleccionado tus asientos"
                      : seleccionados.map((id) => asientos.find((a) => a.asiento_id === id)?.codigo).join(", ")}
                  </p>
                  <div className={styles.totalsBox}>
                    <div className={styles.totalsRow}><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
                    <div className={`${styles.totalsRow} ${styles.totalFinal}`}><span>Total</span><strong>{formatCurrency(total)}</strong></div>
                  </div>
                </aside>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boleto: carpeta que revela el QR al abrirse */}
      <div className={styles.folderDock}>
        <Folder
          color="#7d0f22"
          size={0.65}
          open={boletoAbierto}
          onOpenChange={(v) => {
            setBoletoAbierto(v);
            if (v && !boletoSeleccionado && misCompras && misCompras.length > 0) {
              setBoletoSeleccionado(misCompras[0]);
            }
          }}
          items={
            boletoAbierto
              ? [
                  <div key="qr" className={styles.folderTicket}>
                    {boletoSeleccionado ? <QRCodeSVG value={boletoSeleccionado.codigo} size={48} /> : <span>Sin boleto</span>}
                  </div>,
                ]
              : []
          }
        />
        <span className={styles.folderLabel}>Mi boleto</span>
      </div>

      <AnimatePresence>
        {boletoAbierto && (
          <motion.div
            className={styles.fabPanel}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.fabHead}>
              <strong>Mi boleto</strong>
              <button className={styles.fabClose} onClick={() => setBoletoAbierto(false)} aria-label="Cerrar">
                {IconClose}
              </button>
            </div>

            {!misCompras || misCompras.length === 0 ? (
              <p className={styles.fabEmpty}>Compra un boleto para ver tu código QR aquí.</p>
            ) : (
              <>
                {misCompras.length > 1 && (
                  <div className={styles.fabTicketSwitcher}>
                    {misCompras.map((c) => (
                      <button
                        key={c.id}
                        className={boletoSeleccionado?.id === c.id ? styles.fabTicketChipActive : styles.fabTicketChip}
                        onClick={() => setBoletoSeleccionado(c)}
                      >
                        {c.codigo}
                      </button>
                    ))}
                  </div>
                )}

                {boletoSeleccionado && (
                  <div className={styles.fabTicket}>
                    <span className={styles.fabCode}>{boletoSeleccionado.codigo}</span>
                    <div className={styles.fabQr}>
                      <QRCodeSVG value={qrValueBoleto(boletoSeleccionado)} size={172} />
                    </div>
                    <p className={styles.fabMovie}>{boletoSeleccionado.funcion.pelicula.titulo}</p>
                    <p className={styles.fabMeta}>
                      {boletoSeleccionado.funcion.sala.nombre} · {boletoSeleccionado.boletos.map((b) => b.asiento.codigo).join(", ")}
                    </p>
                    <p className={styles.fabMeta}>{new Date(boletoSeleccionado.funcion.horario).toLocaleString("es-MX")}</p>
                    <button className={styles.downloadBtn} onClick={() => descargarPdf(boletoSeleccionado)}>Descargar boleto en PDF</button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
