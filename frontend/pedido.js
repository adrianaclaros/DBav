const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

const products = [
  { id: 1, name: 'Salteña de pollo/dulce', category: 'Salteña', price: 7, image: 'assets/salteña.jpg' },
  { id: 2, name: 'Salteña de carne', category: 'Salteña', price: 7, image: 'assets/salteña.jpg' },
  { id: 3, name: 'Salteña de mixta', category: 'Salteña', price: 8, image: 'assets/salteña.jpg' },
  { id: 4, name: 'Salteña picante', category: 'Salteña', price: 7, image: 'assets/salteña.jpg' },
  { id: 15, name: 'Salteña de fricase', category: 'Salteña', price: 8, image: 'assets/salteña.jpg' },
  { id: 16, name: 'Salteña extra-picante', category: 'Salteña', price: 8, image: 'assets/salteña.jpg' },
  { id: 5, name: 'Empanada de queso', category: 'Empanada', price: 6, image: 'assets/empanada.jpeg' },
  { id: 6, name: 'Empanada de pollo', category: 'Empanada', price: 6, image: 'assets/empanada.jpeg' },
  { id: 7, name: 'Pan', category: 'Pan', price: 1, image: 'assets/pan.jpg' },
  { id: 8, name: 'Coca-Cola Personal', category: 'Gaseosa', price: 8, image: 'assets/CocaP.png' },
  { id: 9, name: 'Coca-Cola Familiar', category: 'Gaseosa', price: 15, image: 'assets/CocaF.png' },
  { id: 10, name: 'Fanta Personal', category: 'Gaseosa', price: 8, image: 'assets/FantaP.png' },
  { id: 11, name: 'Fanta Familiar', category: 'Gaseosa', price: 15, image: 'assets/FantaF.jpeg' },
  { id: 12, name: 'Mocochinchi', category: 'Jugo', price: 5, image: 'assets/moco.jpeg' },
  { id: 13, name: 'Canela', category: 'Jugo', price: 5, image: 'assets/canela.jpg' },
  { id: 14, name: 'Cebada', category: 'Jugo', price: 5, image: 'assets/cebada.jpeg' }
];

// Elementos del DOM
const productList = document.querySelector('#product-list');
const productSearch = document.querySelector('#product-search');
const orderItems = document.querySelector('#order-items');
const itemCount = document.querySelector('#item-count');
const orderTotal = document.querySelector('#order-total');
const orderNumber = document.querySelector('#order-number');
const clearOrderButton = document.querySelector('#clear-order');
const completeOrderButton = document.querySelector('#complete-order');
const orderFeedback = document.querySelector('#order-feedback');
const userEmail = document.querySelector('#user-email');

// Elementos del Modal de Factura
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

// Estado global de la orden
let cart = [];
let currentOrder = 1;
let selectedFilter = 'todos';

// Auxiliares
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
  return data;
}

// Renderizado de Catálogo
function renderProducts() {
  const term = productSearch.value.trim().toLowerCase();

  const visible = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(term);
    let matchesFilter = true;

    if (selectedFilter === 'saltenas') matchesFilter = product.category === 'Salteña';
    if (selectedFilter === 'masas') matchesFilter = product.category === 'Empanada' || product.category === 'Pan';
    if (selectedFilter === 'bebidas') matchesFilter = product.category === 'Gaseosa' || product.category === 'Jugo';

    return matchesSearch && matchesFilter;
  });

  productList.innerHTML = visible.length
    ? visible
        .map(
          (product) => `
        <article class="product-card">
          <p class="product-name">${product.name}</p>
          <img src="${product.image}" alt="${product.name}" class="product-image">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <button class="add-product" type="button" data-product-id="${product.id}">
            Agregar
          </button>
        </article>
      `
        )
        .join('')
    : '<p class="no-results">No hay productos que coincidan con la búsqueda.</p>';
}

// Renderizado del Carrito/Orden
function renderOrder() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  itemCount.textContent = quantity
    ? `${quantity} producto${quantity === 1 ? '' : 's'} agregado${quantity === 1 ? '' : 's'}`
    : 'Sin productos agregados';

  orderTotal.textContent = formatCurrency(total);
  orderNumber.textContent = `#${String(currentOrder).padStart(3, '0')}`;
  clearOrderButton.disabled = !cart.length;
  completeOrderButton.disabled = !cart.length;

  orderItems.innerHTML = cart.length
    ? cart
        .map(
          (item) => `
        <article class="order-item">
          <div>
            <p class="order-item-name">${item.name}</p>
            <span class="order-item-price">${formatCurrency(item.price)} c/u</span>
            <div class="quantity-control" aria-label="Cantidad de ${item.name}">
              <button type="button" data-action="decrease" data-product-id="${item.id}">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="increase" data-product-id="${item.id}">+</button>
            </div>
          </div>
          <strong class="item-subtotal">${formatCurrency(item.price * item.quantity)}</strong>
        </article>
      `
        )
        .join('')
    : '<p class="empty-state">Aún no agregaste productos al pedido.</p>';
}

// Lógica de Carrito
function addProduct(id) {
  const product = products.find((item) => item.id === id);
  const item = cart.find((entry) => entry.id === id);

  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  orderFeedback.textContent = '';
  renderOrder();
}

function changeQuantity(id, amount) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  item.quantity += amount;
  if (item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== id);
  }

  renderOrder();
}

// Función para mostrar la factura en el modal
function showInvoice(venta, items) {
  if (!venta || !items?.length) return;

  invoiceOrderNumber.textContent = `#${String(venta.Venta_ID).padStart(3, '0')}`;

  const dateText = String(venta.Fecha).slice(0, 10);
  const timeText = String(venta.Hora).slice(0, 8);
  const invoiceDateValue = new Date(`${dateText}T${timeText}`);
  invoiceDate.textContent = Number.isNaN(invoiceDateValue.getTime())
    ? `${dateText} ${timeText}`
    : invoiceDateValue.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });

  invoiceItems.innerHTML = items.map((item) => `
    <div class="invoice-item">
      <span class="invoice-item-name">${item.nombre ?? item.Nombre}</span>
      <span class="invoice-item-quantity">${item.cantidad ?? item.Cantidad}</span>
      <span class="invoice-item-price">${formatCurrency(Number(item.precio_unitario ?? item.Precio_Unitario))}</span>
      <span class="invoice-item-price">${formatCurrency(Number(item.subtotal ?? item.Subtotal))}</span>
    </div>
  `).join('');

  invoiceTotal.textContent = formatCurrency(Number(venta.Total));
  invoicePaymentMethod.textContent = venta.Metodo_Pago;
  invoiceNit.textContent = venta.NIT && venta.NIT !== '0' ? venta.NIT : '—';
  invoiceBusinessName.textContent = venta.Razon_Social && venta.Razon_Social !== 'Sin Nombre' ? venta.Razon_Social : '—';

  invoiceModal.removeAttribute('hidden');
}

function closeInvoiceModal() {
  invoiceModal.setAttribute('hidden', 'true');
}

// Autenticación de Sesión
async function loadNextOrderNumber() {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/ventas?range=ano`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    const maxId = data.ventas.reduce((max, venta) => Math.max(max, Number(venta.Venta_ID)), 0);
    if (maxId > 0) currentOrder = maxId + 1;
    renderOrder();
  } catch (_error) {
    // Si falla esta consulta, el registro de la venta sigue funcionando.
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
    if (userEmail) userEmail.textContent = data.user.email;
  } catch (_error) {
    localStorage.removeItem('authToken');
    window.location.replace('index.html');
  }
}

// Event Listeners
productSearch.addEventListener('input', renderProducts);

document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    selectedFilter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    renderProducts();
  });
});

productList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-product-id]');
  if (button) addProduct(Number(button.dataset.productId));
});

orderItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) {
    changeQuantity(Number(button.dataset.productId), button.dataset.action === 'increase' ? 1 : -1);
  }
});

clearOrderButton.addEventListener('click', () => {
  cart = [];
  orderFeedback.textContent = '';
  renderOrder();
});

// Evento Principal: Registrar Venta y Abrir Factura
completeOrderButton.addEventListener('click', async () => {
  if (!cart.length) return;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const paymentMethod = document.querySelector('#payment-method').value;
  const nit = document.querySelector('#nit').value.trim();
  const businessName = document.querySelector('#business-name').value.trim();
  const token = localStorage.getItem('authToken');

  try {
    completeOrderButton.disabled = true;
    orderFeedback.textContent = 'Procesando venta...';

    // Petición con lectura y manejo seguro de respuesta
    const data = await readResponse(
      await fetch(`${API_BASE_URL}/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          monto_total: total,
          metodo_pago: paymentMethod,
          nit,
          razon_social: businessName,
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity }))
        })
      })
    );

    showInvoice(data.venta, data.items);

    // Reiniciar pedido para el siguiente registro
    cart = [];
    currentOrder = Number(data.venta.Venta_ID) + 1;
    document.querySelector('#nit').value = '';
    document.querySelector('#business-name').value = '';
    orderFeedback.textContent = '';
    renderOrder();
  } catch (error) {
    orderFeedback.textContent = error.message || 'Error al guardar la venta.';
  } finally {
    completeOrderButton.disabled = false;
  }
});

// Eventos de la Factura (Cerrar e Imprimir)
closeInvoiceButton.addEventListener('click', closeInvoiceModal);
if (invoiceOverlay) invoiceOverlay.addEventListener('click', closeInvoiceModal);

printInvoiceButton.addEventListener('click', () => {
  window.print();
});

// Inicialización
validateSession();
loadNextOrderNumber();
renderProducts();
renderOrder();