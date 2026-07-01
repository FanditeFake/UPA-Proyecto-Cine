const PRICE = 85;
const movieName = "Guardianes del Código";
const roomName = "Sala 1";
const schedule = "19:30 hrs";
let currentRole = "user";
let selectedSeats = [];
let occupiedSeats = [];
let sales = [];
let lastTicket = null;
let salesChart = null;

const loginView = document.getElementById("loginView");
const mainView = document.getElementById("mainView");
const loginForm = document.getElementById("loginForm");
const ticketQuantity = document.getElementById("ticketQuantity");
const seatMap = document.getElementById("seatMap");
const membership = document.getElementById("membership");

for (let i = 1; i <= 10; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i;
  ticketQuantity.appendChild(option);
}

document.addEventListener("DOMContentLoaded", () => {
  renderSeats();
  updateSummary();
  renderSalesTable();
  updateDashboard();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  currentRole = document.getElementById("role").value;

  loginView.classList.add("d-none");
  mainView.classList.remove("d-none");

  document.getElementById("sessionName").textContent = currentRole === "admin" ? "Administrador" : "Usuario Cliente";
  document.getElementById("sessionRole").textContent = currentRole === "admin" ? "Panel administrativo" : "Compra de boletos";
  document.getElementById("userAvatar").textContent = currentRole === "admin" ? "A" : "U";

  document.getElementById("adminMenu").classList.toggle("d-none", currentRole !== "admin");
  document.getElementById("salesMenu").classList.toggle("d-none", currentRole !== "admin");
  showPanel("moviesPanel", "Comprar boletos");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  mainView.classList.add("d-none");
  loginView.classList.remove("d-none");
});

document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const view = item.dataset.view;
    const title = item.textContent.trim();
    showPanel(view, title);
  });
});

function showPanel(panelId, title) {
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active-panel"));
  document.getElementById(panelId).classList.add("active-panel");
  document.getElementById("pageTitle").textContent = title;

  document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
  const activeButton = document.querySelector(`[data-view="${panelId}"]`);
  if (activeButton) activeButton.classList.add("active");

  if (panelId === "dashboardPanel") updateDashboard();
  if (panelId === "salesPanel") renderSalesTable();
}

function renderSeats() {
  seatMap.innerHTML = "";
  const letters = ["A", "B", "C", "D"];
  letters.forEach((letter) => {
    for (let number = 1; number <= 5; number++) {
      const seatId = `${letter}${number}`;
      const button = document.createElement("button");
      button.className = "seat";
      button.textContent = seatId;
      button.dataset.seat = seatId;

      if (occupiedSeats.includes(seatId)) {
        button.classList.add("occupied");
        button.disabled = true;
      }

      if (selectedSeats.includes(seatId)) {
        button.classList.add("selected");
      }

      button.addEventListener("click", () => toggleSeat(seatId));
      seatMap.appendChild(button);
    }
  });

  document.getElementById("availableSeats").textContent = 20 - occupiedSeats.length;
}

function toggleSeat(seatId) {
  const maxSeats = Number(ticketQuantity.value);

  if (selectedSeats.includes(seatId)) {
    selectedSeats = selectedSeats.filter((seat) => seat !== seatId);
  } else {
    if (selectedSeats.length >= maxSeats) {
      alert(`Solo puedes seleccionar ${maxSeats} asiento(s).`);
      return;
    }
    selectedSeats.push(seatId);
  }

  renderSeats();
}

ticketQuantity.addEventListener("change", () => {
  selectedSeats = [];
  renderSeats();
  updateSummary();
});

membership.addEventListener("change", updateSummary);

function updateSummary() {
  const quantity = Number(ticketQuantity.value);
  const subtotal = quantity * PRICE;
  const discount = membership.checked ? subtotal * 0.20 : 0;
  const total = subtotal - discount;

  document.getElementById("subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("discount").textContent = formatCurrency(discount);
  document.getElementById("total").textContent = formatCurrency(total);
}

document.getElementById("payBtn").addEventListener("click", () => {
  const quantity = Number(ticketQuantity.value);
  const clientName = document.getElementById("clientName").value.trim();
  const cardHolder = document.getElementById("cardHolder").value.trim();
  const cardNumber = document.getElementById("cardNumber").value.trim();
  const cardDate = document.getElementById("cardDate").value.trim();
  const cardCvv = document.getElementById("cardCvv").value.trim();

  if (!clientName) return alert("Ingresa el nombre del cliente.");
  if (selectedSeats.length !== quantity) return alert("Selecciona la cantidad exacta de asientos.");
  if (!cardHolder) return alert("Ingresa el nombre del titular.");
  if (!/^\d{16}$/.test(cardNumber)) return alert("La tarjeta debe tener 16 dígitos.");
  if (!/^\d{2}\/\d{2}$/.test(cardDate)) return alert("La fecha debe tener formato MM/AA.");
  if (!/^\d{3}$/.test(cardCvv)) return alert("El CVV debe tener 3 dígitos.");

  const subtotal = quantity * PRICE;
  const discount = membership.checked ? subtotal * 0.20 : 0;
  const total = subtotal - discount;
  const code = `CMX-${Math.floor(1000 + Math.random() * 9000)}`;

  lastTicket = {
    code,
    clientName,
    movieName,
    roomName,
    schedule,
    seats: [...selectedSeats],
    quantity,
    membership: membership.checked,
    subtotal,
    discount,
    total,
    date: new Date().toLocaleDateString("es-MX")
  };

  sales.push(lastTicket);
  occupiedSeats.push(...selectedSeats);
  selectedSeats = [];

  renderSeats();
  renderTicket();
  renderSalesTable();
  updateDashboard();
  alert("Pago validado correctamente. Boleto generado.");
  showPanel("myTicketPanel", "Mi boleto");
});

function renderTicket() {
  if (!lastTicket) return;

  document.getElementById("emptyTicket").classList.add("d-none");
  document.getElementById("ticketGenerated").classList.remove("d-none");
  document.getElementById("ticketCode").textContent = lastTicket.code;
  document.getElementById("ticketClient").textContent = lastTicket.clientName;
  document.getElementById("ticketSeats").textContent = lastTicket.seats.join(", ");
  document.getElementById("ticketQty").textContent = lastTicket.quantity;
  document.getElementById("ticketTotal").textContent = formatCurrency(lastTicket.total);

  const qrBox = document.getElementById("qrBox");
  qrBox.innerHTML = "";
  const qrText = `Código: ${lastTicket.code}\nCliente: ${lastTicket.clientName}\nPelícula: ${movieName}\nSala: ${roomName}\nHorario: ${schedule}\nAsientos: ${lastTicket.seats.join(", ")}\nTotal: ${formatCurrency(lastTicket.total)}`;
  new QRCode(qrBox, { text: qrText, width: 150, height: 150 });
}

document.getElementById("downloadTicketBtn").addEventListener("click", () => {
  if (!lastTicket) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("CineMax - Boleto Digital", 20, 20);
  doc.setFontSize(12);
  doc.text(`Código: ${lastTicket.code}`, 20, 40);
  doc.text(`Cliente: ${lastTicket.clientName}`, 20, 50);
  doc.text(`Película: ${lastTicket.movieName}`, 20, 60);
  doc.text(`Sala: ${lastTicket.roomName}`, 20, 70);
  doc.text(`Horario: ${lastTicket.schedule}`, 20, 80);
  doc.text(`Asientos: ${lastTicket.seats.join(", ")}`, 20, 90);
  doc.text(`Boletos: ${lastTicket.quantity}`, 20, 100);
  doc.text(`Total pagado: ${formatCurrency(lastTicket.total)}`, 20, 110);
  doc.text("Nota: El QR se muestra en la interfaz web. Los alumnos pueden integrarlo al PDF como mejora.", 20, 130);

  doc.save(`boleto-${lastTicket.code}.pdf`);
});

function renderSalesTable() {
  const tbody = document.getElementById("salesTable");
  tbody.innerHTML = "";

  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No existen ventas registradas.</td></tr>`;
    return;
  }

  sales.forEach((sale) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sale.code}</td>
      <td>${sale.clientName}</td>
      <td>${sale.movieName}</td>
      <td>${sale.seats.join(", ")}</td>
      <td>${sale.quantity}</td>
      <td>${sale.membership ? "Sí" : "No"}</td>
      <td>${formatCurrency(sale.total)}</td>
      <td>${sale.date}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateDashboard() {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTickets = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalDiscounts = sales.reduce((sum, sale) => sum + sale.discount, 0);

  document.getElementById("statSales").textContent = formatCurrency(totalSales);
  document.getElementById("statTickets").textContent = totalTickets;
  document.getElementById("statDiscounts").textContent = formatCurrency(totalDiscounts);
  document.getElementById("movieTickets").textContent = totalTickets;
  document.getElementById("movieRevenue").textContent = formatCurrency(totalSales);

  renderChart();
}

function renderChart() {
  const ctx = document.getElementById("salesChart");
  if (!ctx) return;

  const today = new Date().toLocaleDateString("es-MX");
  const totalToday = sales.reduce((sum, sale) => sum + sale.total, 0);

  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", today],
      datasets: [{
        label: "Ventas en MXN",
        data: [1200, 950, 1600, 700, 1350, totalToday]
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

document.getElementById("downloadStatsBtn").addEventListener("click", () => {
  const selectedOptions = Array.from(document.querySelectorAll(".report-option:checked")).map(option => option.value);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTickets = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalDiscounts = sales.reduce((sum, sale) => sum + sale.discount, 0);

  doc.setFontSize(20);
  doc.text("CineMax - Reporte Administrativo", 20, 20);
  doc.setFontSize(12);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`, 20, 32);

  let y = 50;
  selectedOptions.forEach((option) => {
    let value = "";
    if (option === "Ventas totales") value = formatCurrency(totalSales);
    if (option === "Boletos vendidos") value = String(totalTickets);
    if (option === "Película más vendida") value = movieName;
    if (option === "Descuentos aplicados") value = formatCurrency(totalDiscounts);

    doc.text(`${option}: ${value}`, 20, y);
    y += 12;
  });

  doc.save("reporte-dashboard-cinemax.pdf");
});

function formatCurrency(value) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
