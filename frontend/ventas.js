// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================
const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

// Elementos del DOM para usuario y navegación
const userEmail = document.querySelector('#user-email');
const logoutButton = document.querySelector('#logout-button');
const historyList = document.querySelector('#sales-history-list');
const historySummary = document.querySelector('#history-summary');

// Elementos del DOM para filtros y búsquedas
const filterForm = document.querySelector('#sales-filter-form');
const filterModeRadios = document.querySelectorAll('input[name="filter-mode"]');
const periodOptions = document.querySelector('#period-options');
const rangeOptions = document.querySelector('#range-options');

const searchQueryInput = document.querySelector('#search-query');
const filterPaymentMethodSelect = document.querySelector('#filter-payment-method');
const filterTypeSelect = document.querySelector('#filter-type');
const filterSuboptions = document.querySelectorAll('.filter-suboptions');

// Subopciones de período de tiempo
const selectDia = document.querySelector('#select-dia');
const dateSpecificDay = document.querySelector('#date-specific-day');

const selectSemana = document.querySelector('#select-semana');
const dateSpecificWeek = document.querySelector('#date-specific-week');

const selectMes = document.querySelector('#select-mes');
const inputMonth = document.querySelector('#input-month');

const selectAno = document.querySelector('#select-ano');
const inputYear = document.querySelector('#input-year');

const dateFromInput = document.querySelector('#date-from');
const dateToInput = document.querySelector('#date-to');
const clearFiltersButton = document.querySelector('#clear-filters');

// Elementos del Modal de Factura / Comprobante
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

// Temporizador para el debounce de la búsqueda en tiempo real
let searchDebounceTimer = null;

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

/**
 * Convierte fecha y hora en formato legible localizado para Bolivia.
 */
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

// ==========================================
// CONTROL DE VISIBILIDAD DE FILTROS
// ==========================================

/**
 * Actualiza la visibilidad de las opciones según el modo seleccionado (periodo o rango).
 */
function updateFilterMode() {
  const selectedMode = document.querySelector('input[name="filter-mode"]:checked')?.value;

  periodOptions?.setAttribute('hidden', 'true');
  rangeOptions?.setAttribute('hidden', 'true');

  if (selectedMode === 'period') {
    periodOptions?.removeAttribute('hidden');
    updatePeriodOptions();
  } else if (selectedMode === 'range') {
    rangeOptions?.removeAttribute('hidden');
  }
}

/**
 * Muestra el grupo de opciones específico para Día, Semana, Mes o Año.
 */
function updatePeriodOptions() {
  const selectedType = filterTypeSelect?.value;
  filterSuboptions.forEach((section) => section.setAttribute('hidden', 'true'));

  if (!selectedType) return;
  const selectedOption = document.querySelector(`#option-${selectedType}`);
  if (selectedOption) selectedOption.removeAttribute('hidden');
}

/**
 * Muestra u oculta selectores adicionales cuando la opción seleccionada es "Otro" (custom).
 */
function updateSuboptionsVisibility() {
  if (selectDia) dateSpecificDay.hidden = selectDia.value !== 'custom';
  if (selectSemana) dateSpecificWeek.hidden = selectSemana.value !== 'custom';
  if (selectMes) inputMonth.hidden = selectMes.value !== 'custom';
  if (selectAno) inputYear.hidden = selectAno.value !== 'custom';
}

// ==========================================
// CONSTRUCCIÓN DE PARÁMETROS Y PETICIONES API
// ==========================================

/**
 * Construye la URLSearchParams leyendo el estado actual de los inputs del DOM.
 */
function buildFilterParams() {
  const params = new URLSearchParams();

  // 1. Búsqueda por texto (query)
  const query = searchQueryInput?.value.trim();
  if (query) params.append('q', query);

  // 2. Filtro por Método de Pago
  const paymentMethod = filterPaymentMethodSelect?.value;
  if (paymentMethod && paymentMethod !== 'todos') {
    params.append('metodo_pago', paymentMethod);
  }

  const selectedMode = document.querySelector('input[name="filter-mode"]:checked')?.value;

  // 3. Filtro por Período
  if (selectedMode === 'period') {
    const type = filterTypeSelect?.value;
    if (type) {
      params.append('type', type);

      if (type === 'dia') {
        const mode = selectDia?.value;
        if (mode) params.append('mode', mode);
        if (mode === 'custom' && dateSpecificDay?.value) {
          params.append('date', dateSpecificDay.value);
        }
      } else if (type === 'semana') {
        const mode = selectSemana?.value;
        if (mode) params.append('mode', mode);
        if (mode === 'custom' && dateSpecificWeek?.value) {
          params.append('date', dateSpecificWeek.value);
        }
      } else if (type === 'mes') {
        const mode = selectMes?.value;
        if (mode) params.append('mode', mode);
        if (mode === 'custom' && inputMonth?.value) {
          params.append('month', inputMonth.value);
        }
      } else if (type === 'ano') {
        const mode = selectAno?.value;
        if (mode) params.append('mode', mode);
        if (mode === 'custom' && inputYear?.value) {
          params.append('year', inputYear.value);
        }
      }
    }
  }

  // 4. Filtro por Rango
  if (selectedMode === 'range') {
    params.append('type', 'rango');
    if (dateFromInput?.value) params.append('from', dateFromInput.value);
    if (dateToInput?.value) params.append('to', dateToInput.value);
  }

  return params;
}

/**
 * Realiza la petición a la API backend para cargar la lista de ventas.
 */
async function loadSales() {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');

  historyList.innerHTML = '<p class="empty-state">Cargando ventas...</p>';

  const params = buildFilterParams();
  const queryString = params.toString();
  const url = queryString ? `${API_BASE_URL}/ventas?${queryString}` : `${API_BASE_URL}/ventas`;

  try {
    const data = await readResponse(
      await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );

    const sales = data.ventas || [];
    historySummary.textContent = sales.length
      ? `${sales.length} venta${sales.length === 1 ? '' : 's'} encontrada${sales.length === 1 ? '' : 's'}`
      : 'No hay ventas registradas que coincidan con los filtros.';

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

// ==========================================
// COMPROBANTE Y MODAL
// ==========================================

/**
 * Llena el modal con la información detallada del comprobante y lo hace visible.
 */
function showInvoice(venta, items) {
  invoiceOrderNumber.textContent = `#${String(venta.Venta_ID).padStart(3, '0')}`;
  invoiceDate.textContent = formatDateTime(venta.Fecha, venta.Hora);

  // Inyección con las clases exactas para la rejilla de 4 columnas
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
  invoiceBusinessName.textContent = venta.Razon_Social && venta.Razon_Social !== 'Sin Nombre' ? venta.Razon_Social : '—';

  invoiceModal.removeAttribute('hidden');
}

/**
 * Cierra el modal del comprobante.
 */
function closeInvoice() {
  invoiceModal.setAttribute('hidden', 'true');
}

/**
 * Solicita los detalles completos de una venta por ID.
 */
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
    await loadSales();
  } catch (_error) {
    localStorage.removeItem('authToken');
    window.location.replace('index.html');
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Búsqueda en tiempo real con efecto debounce (300ms)
searchQueryInput?.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadSales();
  }, 300);
});

// Actualización inmediata al cambiar de método de pago
filterPaymentMethodSelect?.addEventListener('change', () => {
  loadSales();
});

filterModeRadios.forEach((radio) => radio.addEventListener('change', updateFilterMode));
filterTypeSelect?.addEventListener('change', updatePeriodOptions);

[selectDia, selectSemana, selectMes, selectAno].forEach((select) => {
  select?.addEventListener('change', updateSuboptionsVisibility);
});

filterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  loadSales();
});

// Limpieza de filtros y reseteo de la vista
clearFiltersButton?.addEventListener('click', () => {
  filterForm?.reset();
  if (searchQueryInput) searchQueryInput.value = '';
  if (filterPaymentMethodSelect) filterPaymentMethodSelect.value = 'todos';

  const allRadio = document.querySelector('#filter-all');
  if (allRadio) allRadio.checked = true;

  updateFilterMode();
  updatePeriodOptions();
  updateSuboptionsVisibility();
  loadSales();
});

// Delegación de eventos para los botones de ver factura
historyList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-sale-id]');
  if (button) loadInvoice(button.dataset.saleId);
});

closeInvoiceButton?.addEventListener('click', closeInvoice);
invoiceOverlay?.addEventListener('click', closeInvoice);
printInvoiceButton?.addEventListener('click', () => window.print());

// Cerrar el comprobante mediante la tecla Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeInvoice();
});

// Inicializar la vista
updateFilterMode();
updatePeriodOptions();
updateSuboptionsVisibility();
validateSession();