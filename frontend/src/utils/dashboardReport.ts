import jsPDF from "jspdf";
import type { DashboardResumen, VentaResumen } from "../api/types";

const VELVET: [number, number, number] = [125, 15, 34];
const GOLD_SOFT: [number, number, number] = [240, 212, 138];
const INK: [number, number, number] = [28, 21, 18];
const MUTED: [number, number, number] = [138, 123, 108];
const LINE: [number, number, number] = [221, 208, 184];

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function drawHeader(doc: jsPDF, subtitle: string) {
  doc.setFillColor(...VELVET);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(...GOLD_SOFT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CINEMAX", 15, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, 195, 14, { align: "right" });
}

function drawSectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setTextColor(...VELVET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(text, 15, y);
  doc.setDrawColor(...LINE);
  doc.line(15, y + 2.5, 195, y + 2.5);
}

function drawTableRow(
  doc: jsPDF,
  cols: { text: string; x: number; align?: "left" | "right" | "center" }[],
  y: number,
  bold = false
) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  cols.forEach((c) => doc.text(c.text, c.x, y, { align: c.align ?? "left" }));
}

export function generarReporteDashboardPdf(dashboard: DashboardResumen, ventas: VentaResumen[]) {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleString("es-MX");
  drawHeader(doc, `Reporte del Dashboard · ${fecha}`);

  let y = 36;
  drawSectionTitle(doc, "Indicadores generales", y);
  y += 10;

  const ind = dashboard.indicadores;
  const indicadores: [string, string][] = [
    ["Ventas totales", formatCurrency(Number(ind.ventas_totales))],
    ["Boletos vendidos", String(ind.boletos_vendidos)],
    ["Película más vendida", ind.pelicula_mas_vendida || "—"],
    ["Descuentos otorgados", formatCurrency(Number(ind.descuentos_aplicados))],
    ["Clientes registrados", String(ind.total_clientes)],
    ["Compras con membresía", String(ind.compras_con_membresia)],
    ["Compras sin membresía", String(ind.compras_sin_membresia)],
  ];

  indicadores.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 15 + col * 95;
    const rowY = y + row * 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, rowY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    doc.text(value, x, rowY + 5.5);
  });

  y += Math.ceil(indicadores.length / 2) * 14 + 8;

  drawSectionTitle(doc, "Ventas por película", y);
  y += 9;
  drawTableRow(
    doc,
    [
      { text: "PELÍCULA", x: 15 },
      { text: "COMPRAS", x: 120, align: "right" },
      { text: "BOLETOS", x: 155, align: "right" },
      { text: "INGRESOS", x: 195, align: "right" },
    ],
    y,
    true
  );
  y += 3;
  doc.setDrawColor(...LINE);
  doc.line(15, y, 195, y);
  y += 6;

  dashboard.porPelicula.forEach((p) => {
    drawTableRow(
      doc,
      [
        { text: p.pelicula, x: 15 },
        { text: String(p.num_compras), x: 120, align: "right" },
        { text: String(p.boletos_vendidos), x: 155, align: "right" },
        { text: formatCurrency(Number(p.ingresos_totales)), x: 195, align: "right" },
      ],
      y
    );
    y += 7;
  });

  y += 8;
  drawSectionTitle(doc, "Ventas por día", y);
  y += 9;
  drawTableRow(
    doc,
    [
      { text: "DÍA", x: 15 },
      { text: "COMPRAS", x: 110, align: "right" },
      { text: "BOLETOS", x: 145, align: "right" },
      { text: "INGRESOS", x: 195, align: "right" },
    ],
    y,
    true
  );
  y += 3;
  doc.line(15, y, 195, y);
  y += 6;

  dashboard.porDia.forEach((d) => {
    if (y > 275) {
      doc.addPage();
      drawHeader(doc, `Reporte del Dashboard · ${fecha}`);
      y = 36;
    }
    drawTableRow(
      doc,
      [
        { text: d.dia, x: 15 },
        { text: String(d.total_compras), x: 110, align: "right" },
        { text: String(d.total_boletos), x: 145, align: "right" },
        { text: formatCurrency(Number(d.total_ingresos)), x: 195, align: "right" },
      ],
      y
    );
    y += 7;
  });

  doc.addPage();
  drawHeader(doc, `Reporte de ventas · ${fecha}`);
  y = 36;
  drawSectionTitle(doc, "Historial de ventas", y);
  y += 9;
  drawTableRow(
    doc,
    [
      { text: "CÓDIGO", x: 15 },
      { text: "CLIENTE", x: 45 },
      { text: "PELÍCULA", x: 90 },
      { text: "BOLETOS", x: 150, align: "right" },
      { text: "TOTAL", x: 195, align: "right" },
    ],
    y,
    true
  );
  y += 3;
  doc.line(15, y, 195, y);
  y += 6;

  ventas.forEach((v) => {
    if (y > 280) {
      doc.addPage();
      drawHeader(doc, `Reporte de ventas · ${fecha}`);
      y = 36;
    }
    drawTableRow(
      doc,
      [
        { text: v.codigo, x: 15 },
        { text: v.cliente_nombre.slice(0, 20), x: 45 },
        { text: v.funcion.pelicula.titulo.slice(0, 26), x: 90 },
        { text: String(v.cantidad), x: 150, align: "right" },
        { text: formatCurrency(Number(v.total)), x: 195, align: "right" },
      ],
      y
    );
    y += 7;
  });

  doc.save(`reporte-cinemax-${new Date().toISOString().slice(0, 10)}.pdf`);
}
