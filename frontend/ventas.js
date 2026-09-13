const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

const userEmail = document.querySelector('#user-email');
const logoutButton = document.querySelector('#logout-button');
const historyList = document.querySelector('#sales-history-list');
const historySummary = document.querySelector('#history-summary');
const filterButtons = document.querySelectorAll('.history-filters .filter-button');

const invoiceModal = document.querySelector('#invoice-modal');
const invoiceOverlay = document.querySelector('#invoice-overlay');
const closeInvoiceButton = document.querySelector('#close-invoice');
const printInvoiceButton = document.querySelector('#print-invoice');
const invoiceItems = document.querySelector('#invoice-items');
const invoiceTotal = document.querySelector('#invoice-total');
const invoiceOrderNumber = document.querySelector('#invoice-order-number');
const invoiceDate = document.querySelector('#invoice-date');
const invoicePaymentMethod = document.querySelector('#invoice-payment-method');
const invoiceNit = document.querySelector('#invoice-nit');
const invoiceBusinessName = document.querySelector('#invoice-business-name');

let selectedRange = 'dia';

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB'
  }).format(Number(amount));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
  return data;
}

function formatDateTime(fecha, hora) {
  const date = String(fecha).slice(0, 10);
  const time = String(hora).slice(0, 8);
  const value = new Date(`${date}T${time}`);

  if (Number.isNaN(value.getTime())) return `${date} ${time}`;

  return value.toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function showInvoice(venta, items) {
  invoiceOrderNumber.textContent = `#${String(venta.Venta_ID).padStart(3, '0')}`;
  invoiceDate.textContent = formatDateTime(venta.Fecha, venta.Hora);

  invoiceItems.innerHTML = items.map((item) => `
    <div class="invoice-item">
      <span class="invoice-item-name">${escapeHtml(item.Nombre)}</span>
      <span class="invoice-item-quantity">${item.Cantidad}</span>
      <span class="invoice-item-price">${formatCurrency(item.Precio_Unitario)}</span>
      <span class="invoice-item-price">${formatCurrency(item.Subtotal)}</span>
    </div>
  `).join('');

  invoiceTotal.textContent = formatCurrency(venta.Total);
  invoicePaymentMethod.textContent = venta.Metodo_Pago;
  invoiceNit.textContent = venta.NIT && venta.NIT !== '0' ? venta.NIT : '—';
  invoiceBusinessName.textContent = venta.Razon_Social && venta.Razon_Social !== 'Sin Nombre'
    ? venta.Razon_Social
    : '—';

  invoiceModal.removeAttribute('hidden');
}

function closeInvoice() {
  invoiceModal.setAttribute('hidden', 'true');
}

async function loadInvoice(id) {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');

  try {
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/ventas/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    showInvoice(data.venta, data.items);
  } catch (error) {
    alert(error.message || 'No se pudo cargar la factura.');
  }
}

async function loadSales() {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');

  historyList.innerHTML = '<p class="empty-state">Cargando ventas...</p>';

  try {
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/ventas?range=${encodeURIComponent(selectedRange)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );

    const sales = data.ventas || [];
    historySummary.textContent = sales.length
      ? `${sales.length} venta${sales.length === 1 ? '' : 's'} encontrada${sales.length === 1 ? '' : 's'}`
      : 'No hay ventas registradas en este período.';

    if (!sales.length) {
      historyList.innerHTML = '<p class="empty-state">No hay comprobantes para mostrar.</p>';
      return;
    }

    historyList.innerHTML = sales.map((venta) => `
      <div class="history-row">
        <strong>#${String(venta.Venta_ID).padStart(3, '0')}</strong>
        <span>${escapeHtml(formatDateTime(venta.Fecha, venta.Hora))}</span>
        <span>${escapeHtml(venta.Metodo_Pago)}</span>
        <strong>${formatCurrency(venta.Total)}</strong>
        <button type="button" class="history-view-button" data-sale-id="${venta.Venta_ID}">
          Ver factura
        </button>
      </div>
    `).join('');
  } catch (error) {
    historySummary.textContent = 'No se pudo cargar el historial.';
    historyList.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Error al cargar las ventas.')}</p>`;
  }
}

async function validateSession() {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');

  try {
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    userEmail.textContent = data.user.email;
    await loadSales();
  } catch (_error) {
    localStorage.removeItem('authToken');
    window.location.replace('index.html');
  }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedRange = button.dataset.range;
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadSales();
  });
});

historyList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-sale-id]');
  if (button) loadInvoice(button.dataset.saleId);
});

closeInvoiceButton.addEventListener('click', closeInvoice);
invoiceOverlay.addEventListener('click', closeInvoice);
printInvoiceButton.addEventListener('click', () => window.print());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeInvoice();
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.replace('index.html');
});

validateSession();
