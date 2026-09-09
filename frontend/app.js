const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
const products = [
  { id: 1, name: 'Salteña de carne', category: 'Salteñas', price: 8 },
  { id: 2, name: 'Salteña de pollo', category: 'Salteñas', price: 8 },
  { id: 3, name: 'Salteña de queso', category: 'Salteñas', price: 7 },
  { id: 4, name: 'Empanada de queso', category: 'Empanadas', price: 6 },
  { id: 5, name: 'Api morado', category: 'Bebidas', price: 5 },
  { id: 6, name: 'Café', category: 'Bebidas', price: 6 }
];

const loginForm = document.querySelector('#login-form');
const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');
const feedback = document.querySelector('#feedback');
const logoutButton = document.querySelector('#logout-button');
const userEmail = document.querySelector('#user-email');
const productList = document.querySelector('#product-list');
const productSearch = document.querySelector('#product-search');
const orderItems = document.querySelector('#order-items');
const itemCount = document.querySelector('#item-count');
const orderTotal = document.querySelector('#order-total');
const orderNumber = document.querySelector('#order-number');
const clearOrderButton = document.querySelector('#clear-order');
const completeOrderButton = document.querySelector('#complete-order');
const orderFeedback = document.querySelector('#order-feedback');

let cart = [];
let currentOrder = 1;

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);
}

function showFeedback(message = '') { feedback.textContent = message; }

function showDashboard(email) {
  window.location.assign('pedidos.html');
}

function showLogin(message = '') {
  dashboardView.hidden = true;
  loginView.hidden = false;
  document.title = 'Salteñas Cuzque | Acceso';
  showFeedback(message);
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
  return data;
}

function renderProducts() {
  const term = productSearch.value.trim().toLowerCase();
  const visibleProducts = products.filter(({ name, category }) => `${name} ${category}`.toLowerCase().includes(term));
  productList.innerHTML = visibleProducts.length
    ? visibleProducts.map((product) => `
      <article class="product-card">
        <span class="product-category">${product.category}</span>
        <p class="product-name">${product.name}</p>
        <span class="product-price">${formatCurrency(product.price)}</span>
        <button class="add-product" type="button" data-product-id="${product.id}">Agregar</button>
      </article>`).join('')
    : '<p class="no-results">No hay productos que coincidan con la búsqueda.</p>';
}

function addProduct(productId) {
  const product = products.find((item) => item.id === productId);
  const existing = cart.find((item) => item.id === productId);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  orderFeedback.textContent = '';
  renderOrder();
}

function changeQuantity(productId, change) {
  const item = cart.find((product) => product.id === productId);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter((product) => product.id !== productId);
  renderOrder();
}

function renderOrder() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  itemCount.textContent = quantity ? `${quantity} producto${quantity === 1 ? '' : 's'} agregado${quantity === 1 ? '' : 's'}` : 'Sin productos agregados';
  orderTotal.textContent = formatCurrency(total);
  orderNumber.textContent = `#${String(currentOrder).padStart(3, '0')}`;
  clearOrderButton.disabled = cart.length === 0;
  completeOrderButton.disabled = cart.length === 0;
  orderItems.innerHTML = cart.length
    ? cart.map((item) => `
      <article class="order-item">
        <div>
          <p class="order-item-name">${item.name}</p>
          <span class="order-item-price">${formatCurrency(item.price)} c/u</span>
          <div class="quantity-control" aria-label="Cantidad de ${item.name}">
            <button type="button" data-action="decrease" data-product-id="${item.id}" aria-label="Quitar una unidad">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" data-product-id="${item.id}" aria-label="Agregar una unidad">+</button>
          </div>
        </div>
        <strong class="item-subtotal">${formatCurrency(item.price * item.quantity)}</strong>
      </article>`).join('')
    : '<p class="empty-state">Aún no agregaste productos al pedido.</p>';
}

async function loadCurrentUser() {
  const token = localStorage.getItem('authToken');
  if (!token) return showLogin();
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readResponse(response);
    showDashboard(data.user.email);
  } catch (_error) {
    localStorage.removeItem('authToken');
    showLogin('Tu sesión venció. Vuelve a iniciar sesión.');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showFeedback();
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector('button');
  submitButton.disabled = true;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
    });
    const data = await readResponse(response);
    localStorage.setItem('authToken', data.token);
    const meResponse = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${data.token}` } });
    const me = await readResponse(meResponse);
    loginForm.reset();
    showDashboard(me.user.email);
  } catch (error) {
    showFeedback(error.message || 'No se pudo iniciar sesión.');
  } finally { submitButton.disabled = false; }
});

productSearch.addEventListener('input', renderProducts);
productList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-product-id]');
  if (button) addProduct(Number(button.dataset.productId));
});
orderItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  changeQuantity(Number(button.dataset.productId), button.dataset.action === 'increase' ? 1 : -1);
});
clearOrderButton.addEventListener('click', () => { cart = []; orderFeedback.textContent = ''; renderOrder(); });
completeOrderButton.addEventListener('click', () => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  orderFeedback.textContent = `Venta de ${formatCurrency(total)} lista para registrar en la base de datos.`;
  cart = [];
  currentOrder += 1;
  renderOrder();
});
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  cart = [];
  showLogin('Sesión cerrada correctamente.');
});

loadCurrentUser();
