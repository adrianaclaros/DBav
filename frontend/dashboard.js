// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================
const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

const userEmail = document.querySelector('#user-email');

const kpiVentasHoy = document.querySelector('#kpi-ventas-hoy');
const kpiVentasHoySub = document.querySelector('#kpi-ventas-hoy-sub');
const kpiPedidosHoy = document.querySelector('#kpi-pedidos-hoy');
const kpiProductoTop = document.querySelector('#kpi-producto-top');
const kpiProductoTopSub = document.querySelector('#kpi-producto-top-sub');
const paymentBreakdown = document.querySelector('#payment-breakdown');
const dashboardFeedback = document.querySelector('#dashboard-feedback');

const salesTrendCanvas = document.querySelector('#sales-trend-chart');
const topProductsCanvas = document.querySelector('#top-products-chart');

// Colores del tema, reutilizados para los gráficos
const THEME = {
  turquoiseDeep: '#689689',
  turquoiseLight: '#95B6A9',
  terracotta: '#B16458',
  clay: '#9C6F63',
  sand: '#CAB4A8',
  brown: '#4A3321'
};

const PAYMENT_COLORS = {
  Efectivo: THEME.turquoiseDeep,
  QR: THEME.terracotta,
  Tarjeta: THEME.clay
};

let salesTrendChart = null;
let topProductsChart = null;

// ==========================================
// FUNCIONES UTILITARIAS
// ==========================================

/**
 * Formatea un monto numérico a formato de moneda Boliviana (BOB).
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB'
  }).format(Number(amount));
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a un formato corto y legible.
 */
function formatShortDate(isoDate) {
  const date = new Date(`${String(isoDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(isoDate);

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short'
  });
}

/**
 * Escapa caracteres HTML para evitar vulnerabilidades XSS.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Lee la respuesta HTTP en JSON e identifica errores de servidor.
 */
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
  return data;
}

// ==========================================
// RENDERIZADO DE TARJETAS (KPIs)
// ==========================================

function renderKpis(data) {
  kpiVentasHoy.textContent = formatCurrency(data.ventasHoy.total);
  kpiVentasHoySub.textContent = `${data.ventasHoy.cantidadPedidos} pedido${data.ventasHoy.cantidadPedidos === 1 ? '' : 's'} registrados hoy`;

  kpiPedidosHoy.textContent = String(data.ventasHoy.cantidadPedidos);

  if (data.productoMasVendido) {
  kpiProductoTop.textContent = data.productoMasVendido.nombre;
  kpiProductoTopSub.textContent = `${data.productoMasVendido.unidades} unidades solicitadas hoy`;
} else {
  kpiProductoTop.textContent = 'Sin datos';
  kpiProductoTopSub.textContent = 'No hay solicitudes registradas hoy';
}

  const metodos = Object.entries(data.pagosPorMetodo);

const totalDia = metodos.reduce(
  (sum, [, datos]) => sum + Number(datos.total),
  0
);

paymentBreakdown.innerHTML = metodos.map(([metodo, datos]) => {
  const monto = Number(datos.total);
  const cantidadPagos = Number(datos.cantidadPagos);

  const porcentaje = totalDia > 0
    ? Math.round((monto / totalDia) * 100)
    : 0;

  const color = PAYMENT_COLORS[metodo] || THEME.brown;

  return `
    <div class="payment-row">
      <div class="payment-row-header">
        <span
          class="payment-dot"
          style="background:${color}"
        ></span>

        <span class="payment-method-name">
          ${escapeHtml(metodo)}
        </span>

        <strong class="payment-amount">
          ${formatCurrency(monto)}
          <span class="payment-count">
            (${cantidadPagos} ${cantidadPagos === 1 ? 'pago' : 'pagos'})
          </span>
        </strong>
      </div>

      <div class="payment-bar-track">
        <div
          class="payment-bar-fill"
          style="width:${porcentaje}%; background:${color}"
        ></div>
      </div>
    </div>
  `;
}).join('');
}

// ==========================================
// RENDERIZADO DE GRÁFICOS
// ==========================================

function renderSalesTrendChart(ventasUltimosDias) {
  const labels = ventasUltimosDias.map((item) => formatShortDate(item.fecha));
  const values = ventasUltimosDias.map((item) => item.total);

  if (salesTrendChart) salesTrendChart.destroy();

  salesTrendChart = new Chart(salesTrendCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total vendido',
        data: values,
        borderColor: THEME.turquoiseDeep,
        backgroundColor: '#68968933',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: THEME.turquoiseDeep,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrency(context.parsed.y)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => `Bs ${value}` }
        }
      }
    }
  });
}

function renderTopProductsChart(productosMasVendidos) {
  const labels = productosMasVendidos.map((item) => item.nombre);
  const values = productosMasVendidos.map((item) => item.unidades);

  if (topProductsChart) topProductsChart.destroy();

  topProductsChart = new Chart(topProductsCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Unidades vendidas',
        data: values,
        backgroundColor: THEME.terracotta,
        borderRadius: 6,
        maxBarThickness: 42
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

// ==========================================
// CARGA DE DATOS
// ==========================================

async function loadDashboard() {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');

  dashboardFeedback.textContent = '';

  try {
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );

    renderKpis(data);
    renderSalesTrendChart(data.ventasUltimosDias);

    if (data.productosMasVendidos.length) {
      renderTopProductsChart(data.productosMasVendidos);
    } else {
      dashboardFeedback.textContent = 'Aún no hay suficientes ventas para graficar productos más vendidos.';
    }

  } catch (error) {
    dashboardFeedback.textContent = error.message || 'No se pudo cargar el dashboard.';
  }
}

/**
 * Valida la autenticación del usuario activo.
 */
async function validateSession() {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');

  try {
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    if (userEmail) userEmail.textContent = data.user.email;
    await loadDashboard();
  } catch (_error) {
    localStorage.removeItem('authToken');
    window.location.replace('index.html');
  }
}

validateSession();
