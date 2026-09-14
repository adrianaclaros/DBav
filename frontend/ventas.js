// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================

const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;


// ==========================================
// ELEMENTOS DEL DOM
// ==========================================

const userEmail = document.querySelector('#user-email');
const logoutButton = document.querySelector('#logout-button');

const historyList = document.querySelector('#sales-history-list');
const historySummary = document.querySelector('#history-summary');


// ==========================================
// ELEMENTOS DE FILTROS
// ==========================================

const filterForm = document.querySelector('#sales-filter-form');

const filterModeRadios =
  document.querySelectorAll('input[name="filter-mode"]');

const periodOptions =
  document.querySelector('#period-options');

const rangeOptions =
  document.querySelector('#range-options');

const searchQueryInput =
  document.querySelector('#search-query');

const filterPaymentMethodSelect =
  document.querySelector('#filter-payment-method');

const filterTypeSelect =
  document.querySelector('#filter-type');


// ==========================================
// OPCIONES DE DÍA
// ==========================================

const optionDia =
  document.querySelector('#option-dia');

const selectDia =
  document.querySelector('#select-dia');

const dateSpecificDay =
  document.querySelector('#date-specific-day');


// ==========================================
// OPCIONES DE SEMANA
// ==========================================

const optionSemana =
  document.querySelector('#option-semana');

const selectSemana =
  document.querySelector('#select-semana');

const dateSpecificWeek =
  document.querySelector('#date-specific-week');


// ==========================================
// OPCIONES DE MES
// ==========================================

const optionMes =
  document.querySelector('#option-mes');

const selectMes =
  document.querySelector('#select-mes');

const inputMonth =
  document.querySelector('#input-month');


// ==========================================
// OPCIONES DE AÑO
// ==========================================

const optionAno =
  document.querySelector('#option-ano');

const selectAno =
  document.querySelector('#select-ano');

const inputYear =
  document.querySelector('#input-year');


// ==========================================
// RANGO
// ==========================================

const dateFromInput =
  document.querySelector('#date-from');

const dateToInput =
  document.querySelector('#date-to');

const clearFiltersButton =
  document.querySelector('#clear-filters');


// ==========================================
// MODAL DE FACTURA
// ==========================================

const invoiceModal =
  document.querySelector('#invoice-modal');

const invoiceOverlay =
  document.querySelector('#invoice-overlay');

const closeInvoiceButton =
  document.querySelector('#close-invoice');

const printInvoiceButton =
  document.querySelector('#print-invoice');

const invoiceItems =
  document.querySelector('#invoice-items');

const invoiceTotal =
  document.querySelector('#invoice-total');

const invoiceOrderNumber =
  document.querySelector('#invoice-order-number');

const invoiceDate =
  document.querySelector('#invoice-date');

const invoicePaymentMethod =
  document.querySelector('#invoice-payment-method');

const invoiceNit =
  document.querySelector('#invoice-nit');

const invoiceBusinessName =
  document.querySelector('#invoice-business-name');


// ==========================================
// VARIABLES
// ==========================================

let searchDebounceTimer = null;


// ==========================================
// FUNCIONES UTILITARIAS
// ==========================================

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

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {

    throw new Error(
      data.message ||
      'No se pudo completar la solicitud.'
    );

  }

  return data;

}


function formatDateTime(fecha, hora) {

  const date =
    String(fecha).slice(0, 10);

  const time =
    String(hora).slice(0, 8);

  const value =
    new Date(`${date}T${time}`);

  if (Number.isNaN(value.getTime())) {

    return `${date} ${time}`;

  }

  return value.toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

}


// ==========================================
// CONTROL DEL MODO PRINCIPAL
// ==========================================

function updateFilterMode() {

  const selectedMode =
    document.querySelector(
      'input[name="filter-mode"]:checked'
    )?.value;


  // Ocultar ambos bloques primero.

  periodOptions?.setAttribute(
    'hidden',
    'true'
  );

  rangeOptions?.setAttribute(
    'hidden',
    'true'
  );


  // Mostrar solamente el seleccionado.

  if (selectedMode === 'period') {

    periodOptions?.removeAttribute(
      'hidden'
    );

    updatePeriodOptions();

  }


  if (selectedMode === 'range') {

    rangeOptions?.removeAttribute(
      'hidden'
    );

  }

}


// ==========================================
// CONTROL DÍA / SEMANA / MES / AÑO
// ==========================================

function updatePeriodOptions() {

  const selectedType =
    filterTypeSelect?.value;


  // Ocultar TODOS los bloques.

  optionDia?.setAttribute(
    'hidden',
    'true'
  );

  optionSemana?.setAttribute(
    'hidden',
    'true'
  );

  optionMes?.setAttribute(
    'hidden',
    'true'
  );

  optionAno?.setAttribute(
    'hidden',
    'true'
  );


  // Mostrar solamente el bloque seleccionado.

  switch (selectedType) {

    case 'dia':

      optionDia?.removeAttribute(
        'hidden'
      );

      break;


    case 'semana':

      optionSemana?.removeAttribute(
        'hidden'
      );

      break;


    case 'mes':

      optionMes?.removeAttribute(
        'hidden'
      );

      break;


    case 'ano':

      optionAno?.removeAttribute(
        'hidden'
      );

      break;

  }


  updateSuboptionsVisibility();

}


// ==========================================
// CONTROL DE "OTRO"
// ==========================================

function updateSuboptionsVisibility() {


  // ------------------------------
  // DÍA
  // ------------------------------

  if (dateSpecificDay) {

    dateSpecificDay.hidden =
      selectDia?.value !== 'custom';

  }


  // ------------------------------
  // SEMANA
  // ------------------------------

  if (dateSpecificWeek) {

    dateSpecificWeek.hidden =
      selectSemana?.value !== 'custom';

  }


  // ------------------------------
  // MES
  // ------------------------------

  if (inputMonth) {

    inputMonth.hidden =
      selectMes?.value !== 'custom';

  }


  // ------------------------------
  // AÑO
  // ------------------------------

  if (inputYear) {

    inputYear.hidden =
      selectAno?.value !== 'custom';

  }

}


// ==========================================
// CONSTRUCCIÓN DE PARÁMETROS
// ==========================================

function buildFilterParams() {

  const params =
    new URLSearchParams();


  // ========================================
  // 1. BÚSQUEDA
  // ========================================

  const query =
    searchQueryInput?.value.trim();

  if (query) {

    params.append(
      'q',
      query
    );

  }


  // ========================================
  // 2. MÉTODO DE PAGO
  // ========================================

  const paymentMethod =
    filterPaymentMethodSelect?.value;

  if (
    paymentMethod &&
    paymentMethod !== 'todos'
  ) {

    params.append(
      'metodo_pago',
      paymentMethod
    );

  }


  // ========================================
  // 3. MODO DE FILTRO
  // ========================================

  const selectedMode =
    document.querySelector(
      'input[name="filter-mode"]:checked'
    )?.value;


  // ========================================
  // 4. PERÍODO
  // ========================================

  if (selectedMode === 'period') {

    const type =
      filterTypeSelect?.value;


    if (type) {

      params.append(
        'type',
        type
      );


      // ------------------------------
      // DÍA
      // ------------------------------

      if (type === 'dia') {

        const mode =
          selectDia?.value || 'hoy';

        params.append(
          'mode',
          mode
        );


        if (
          mode === 'custom' &&
          dateSpecificDay?.value
        ) {

          params.append(
            'date',
            dateSpecificDay.value
          );

        }

      }


      // ------------------------------
      // SEMANA
      // ------------------------------

      else if (type === 'semana') {

        const mode =
          selectSemana?.value ||
          'esta-semana';

        params.append(
          'mode',
          mode
        );


        if (
          mode === 'custom' &&
          dateSpecificWeek?.value
        ) {

          params.append(
            'date',
            dateSpecificWeek.value
          );

        }

      }


      // ------------------------------
      // MES
      // ------------------------------

      else if (type === 'mes') {

        const mode =
          selectMes?.value ||
          'actual';

        params.append(
          'mode',
          mode
        );


        if (
          mode === 'custom' &&
          inputMonth?.value
        ) {

          params.append(
            'month',
            inputMonth.value
          );

        }

      }


      // ------------------------------
      // AÑO
      // ------------------------------

      else if (type === 'ano') {

        const mode =
          selectAno?.value ||
          'actual';

        params.append(
          'mode',
          mode
        );


        if (
          mode === 'custom' &&
          inputYear?.value
        ) {

          params.append(
            'year',
            inputYear.value
          );

        }

      }

    }

  }


  // ========================================
  // 5. RANGO
  // ========================================

  if (selectedMode === 'range') {

    params.append(
      'type',
      'rango'
    );


    if (dateFromInput?.value) {

      params.append(
        'from',
        dateFromInput.value
      );

    }


    if (dateToInput?.value) {

      params.append(
        'to',
        dateToInput.value
      );

    }

  }


  return params;

}


// ==========================================
// CARGAR VENTAS
// ==========================================

async function loadSales() {

  const token =
    localStorage.getItem('authToken');


  if (!token) {

    return window.location.replace(
      'index.html'
    );

  }


  historyList.innerHTML =
    '<p class="empty-state">Cargando ventas...</p>';


  const params =
    buildFilterParams();

  const queryString =
    params.toString();


  const url =
    queryString
      ? `${API_BASE_URL}/ventas?${queryString}`
      : `${API_BASE_URL}/ventas`;


  try {

    const data =
      await readResponse(
        await fetch(url, {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        })
      );


    const sales =
      data.ventas || [];


    historySummary.textContent =
      sales.length
        ? `${sales.length} venta${sales.length === 1 ? '' : 's'} encontrada${sales.length === 1 ? '' : 's'}`
        : 'No hay ventas registradas que coincidan con los filtros.';


    if (!sales.length) {

      historyList.innerHTML =
        '<p class="empty-state">No hay comprobantes para mostrar.</p>';

      return;

    }


    historyList.innerHTML =
      sales.map((venta) => `

        <div class="history-row">

          <strong>
            #${String(venta.Venta_ID).padStart(3, '0')}
          </strong>

          <span>
            ${escapeHtml(
              formatDateTime(
                venta.Fecha,
                venta.Hora
              )
            )}
          </span>

          <span>
            ${escapeHtml(
              venta.Metodo_Pago
            )}
          </span>

          <strong>
            ${formatCurrency(
              venta.Total
            )}
          </strong>

          <button
            type="button"
            class="history-view-button"
            data-sale-id="${venta.Venta_ID}">

            Ver factura

          </button>

        </div>

      `).join('');


  } catch (error) {

    historySummary.textContent =
      'No se pudo cargar el historial.';

    historyList.innerHTML =
      `<p class="empty-state">
        ${escapeHtml(
          error.message ||
          'Error al cargar las ventas.'
        )}
      </p>`;

  }

}


// ==========================================
// MODAL DE FACTURA
// ==========================================

function showInvoice(venta, items) {

  invoiceOrderNumber.textContent =
    `#${String(
      venta.Venta_ID
    ).padStart(3, '0')}`;


  invoiceDate.textContent =
    formatDateTime(
      venta.Fecha,
      venta.Hora
    );


  invoiceItems.innerHTML =
    items.map((item) => `

      <div class="invoice-item">

        <span class="invoice-item-name">
          ${escapeHtml(
            item.Nombre
          )}
        </span>

        <span class="invoice-item-quantity">
          ${item.Cantidad}
        </span>

        <span class="invoice-item-price">
          ${formatCurrency(
            item.Precio_Unitario
          )}
        </span>

        <span class="invoice-item-price">
          ${formatCurrency(
            item.Subtotal
          )}
        </span>

      </div>

    `).join('');


  invoiceTotal.textContent =
    formatCurrency(
      venta.Total
    );


  invoicePaymentMethod.textContent =
    venta.Metodo_Pago;


  invoiceNit.textContent =
    venta.NIT &&
    venta.NIT !== '0'
      ? venta.NIT
      : '—';


  invoiceBusinessName.textContent =
    venta.Razon_Social &&
    venta.Razon_Social !== 'Sin Nombre'
      ? venta.Razon_Social
      : '—';


  invoiceModal.removeAttribute(
    'hidden'
  );

}


function closeInvoice() {

  invoiceModal.setAttribute(
    'hidden',
    'true'
  );

}


async function loadInvoice(id) {

  const token =
    localStorage.getItem('authToken');


  if (!token) {

    return window.location.replace(
      'index.html'
    );

  }


  try {

    const data =
      await readResponse(
        await fetch(
          `${API_BASE_URL}/ventas/${id}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        )
      );


    showInvoice(
      data.venta,
      data.items
    );


  } catch (error) {

    alert(
      error.message ||
      'No se pudo cargar la factura.'
    );

  }

}


// ==========================================
// VALIDAR SESIÓN
// ==========================================

async function validateSession() {

  const token =
    localStorage.getItem('authToken');


  if (!token) {

    return window.location.replace(
      'index.html'
    );

  }


  try {

    const data =
      await readResponse(
        await fetch(
          `${API_BASE_URL}/auth/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        )
      );


    if (userEmail) {

      userEmail.textContent =
        data.user.email;

    }


    await loadSales();


  } catch (_error) {

    localStorage.removeItem(
      'authToken'
    );

    window.location.replace(
      'index.html'
    );

  }

}


// ==========================================
// EVENT LISTENERS
// ==========================================


// ------------------------------------------
// Búsqueda
// ------------------------------------------

searchQueryInput?.addEventListener(
  'input',
  () => {

    clearTimeout(
      searchDebounceTimer
    );


    searchDebounceTimer =
      setTimeout(
        () => loadSales(),
        300
      );

  }
);


// ------------------------------------------
// Método de pago
// ------------------------------------------

filterPaymentMethodSelect?.addEventListener(
  'change',
  () => {

    loadSales();

  }
);


// ------------------------------------------
// Periodo / rango
// ------------------------------------------

filterModeRadios.forEach(
  (radio) => {

    radio.addEventListener(
      'change',
      updateFilterMode
    );

  }
);


// ------------------------------------------
// Día / semana / mes / año
// ------------------------------------------

filterTypeSelect?.addEventListener(
  'change',
  updatePeriodOptions
);


selectDia?.addEventListener(
  'change',
  updateSuboptionsVisibility
);


selectSemana?.addEventListener(
  'change',
  updateSuboptionsVisibility
);


selectMes?.addEventListener(
  'change',
  updateSuboptionsVisibility
);


selectAno?.addEventListener(
  'change',
  updateSuboptionsVisibility
);


// ------------------------------------------
// Aplicar filtro
// ------------------------------------------

filterForm?.addEventListener(
  'submit',
  (event) => {

    event.preventDefault();

    loadSales();

  }
);


// ------------------------------------------
// Restablecer
// ------------------------------------------

clearFiltersButton?.addEventListener(
  'click',
  () => {

    filterForm?.reset();


    // Búsqueda

    if (searchQueryInput) {

      searchQueryInput.value = '';

    }


    // Método de pago

    if (filterPaymentMethodSelect) {

      filterPaymentMethodSelect.value =
        'todos';

    }


    // Restaurar Día → Hoy

    if (filterModeRadios.length) {

      const periodRadio =
        document.querySelector(
          '#filter-period'
        );

      if (periodRadio) {

        periodRadio.checked =
          true;

      }

    }


    if (filterTypeSelect) {

      filterTypeSelect.value =
        'dia';

    }


    if (selectDia) {

      selectDia.value =
        'hoy';

    }


    // Limpiar fechas personalizadas

    if (dateSpecificDay) {

      dateSpecificDay.value =
        '';

    }


    if (dateSpecificWeek) {

      dateSpecificWeek.value =
        '';

    }


    if (inputMonth) {

      inputMonth.value =
        '';

    }


    if (inputYear) {

      inputYear.value =
        '';

    }


    if (dateFromInput) {

      dateFromInput.value =
        '';

    }


    if (dateToInput) {

      dateToInput.value =
        '';

    }


    updateFilterMode();
    updatePeriodOptions();
    updateSuboptionsVisibility();

    loadSales();

  }
);


// ==========================================
// BOTONES "VER FACTURA"
// ==========================================

historyList.addEventListener(
  'click',
  (event) => {

    const button =
      event.target.closest(
        '[data-sale-id]'
      );


    if (button) {

      loadInvoice(
        button.dataset.saleId
      );

    }

  }
);


// ==========================================
// MODAL
// ==========================================

closeInvoiceButton?.addEventListener(
  'click',
  closeInvoice
);


invoiceOverlay?.addEventListener(
  'click',
  closeInvoice
);


printInvoiceButton?.addEventListener(
  'click',
  () => window.print()
);


// ------------------------------------------
// Escape
// ------------------------------------------

document.addEventListener(
  'keydown',
  (event) => {

    if (event.key === 'Escape') {

      closeInvoice();

    }

  }
);


// ==========================================
// INICIALIZACIÓN
// ==========================================

// Estado inicial:
// Día → Hoy

if (filterTypeSelect) {

  filterTypeSelect.value =
    'dia';

}

if (selectDia) {

  selectDia.value =
    'hoy';

}

if (filterPaymentMethodSelect) {

  filterPaymentMethodSelect.value =
    'todos';

}

updateFilterMode();
updatePeriodOptions();
updateSuboptionsVisibility();

validateSession();
