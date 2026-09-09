const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
const products = [
  { id: 1, name: 'Salteña de pollo/dulce', category: 'Salteña', price: 7,
    image: "assets/salteña.jpg" },
  { id: 2, name: 'Salteña de carne', category: 'Salteña', price: 7,
    image: "assets/salteña.jpg" },
  { id: 3, name: 'Salteña de mixta', category: 'Salteña', price: 8,
    image: "assets/salteña.jpg" },
  { id: 4, name: 'Salteña picante', category: 'Salteña', price: 7,
    image: "assets/salteña.jpg" },
  { id: 15, name: 'Salteña de fricase', category: 'Salteña', price: 8,
    image: "assets/salteña.jpg" },
  { id: 16, name: 'Salteña extra-picante', category: 'Salteña', price: 8,
    image: "assets/salteña.jpg" },
  { id: 5, name: 'Empanada de queso', category: 'Empanada', price: 6,
    image: "assets/empanada.jpeg" },
  { id: 6, name: 'Empanada de pollo', category: 'Empanada', price: 6,
    image: "assets/empanada.jpeg" },
  { id: 7, name: 'Pan', category: 'Pan', price: 1,
    image: "assets/pan.jpg" },
  { id: 8, name: 'Coca-Cola Personal', category: 'Gaseosa', price: 8,
    image: "assets/CocaP.png" },
  { id: 9, name: 'Coca-Cola Familiar', category: 'Gaseosa', price: 15,
    image: "assets/CocaF.png" },
  { id: 10, name: 'Fanta Personal', category: 'Gaseosa', price: 8,
    image: "assets/FantaP.png" },
  { id: 11, name: 'Fanta Familiar', category: 'Gaseosa', price: 15,
    image: "assets/FantaF.jpeg" },
  { id: 12, name: 'Mocochinchi', category: 'Jugo', price: 5,
    image: "assets/moco.jpeg" },
  { id: 13, name: 'Canela', category: 'Jugo', price: 5,
    image: "assets/canela.jpg" },
  { id: 14, name: 'Cebada', category: 'Jugo', price: 5,
    image: "assets/cebada.jpeg" }
];
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
let cart = [];
let currentOrder = 1;
let selectedFilter = 'todos';
function formatCurrency(amount) { return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount); }
function readResponse(response) { return response.json().catch(() => ({})).then((data) => { if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.'); return data; }); }

function renderProducts() {
  const term = productSearch.value.trim().toLowerCase();

  const visible = products.filter((product) => {
    const matchesSearch =
      `${product.name} ${product.category}`
        .toLowerCase()
        .includes(term);

    let matchesFilter = true;

    if (selectedFilter === 'saltenas') {
      matchesFilter = product.category === 'Salteña';
    }

    if (selectedFilter === 'masas') {
      matchesFilter =
        product.category === 'Empanada' ||
        product.category === 'Pan';
    }

    if (selectedFilter === 'bebidas') {
      matchesFilter =
        product.category === 'Gaseosa' ||
        product.category === 'Jugo';
    }

    return matchesSearch && matchesFilter;
  });

  productList.innerHTML = visible.length
    ? visible.map((product) => `
        <article class="product-card">

          <p class="product-name">${product.name}</p>

          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="product-image"
          >

          <span class="product-price">
            ${formatCurrency(product.price)}
          </span>

          <button 
            class="add-product" 
            type="button" 
            data-product-id="${product.id}"
          >
            Agregar
          </button>

        </article>
      `).join('')
    : '<p class="no-results">No hay productos que coincidan con la búsqueda.</p>';
}

function renderOrder() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  itemCount.textContent = quantity ? `${quantity} producto${quantity === 1 ? '' : 's'} agregado${quantity === 1 ? '' : 's'}` : 'Sin productos agregados';
  orderTotal.textContent = formatCurrency(total);
  orderNumber.textContent = `#${String(currentOrder).padStart(3, '0')}`;
  clearOrderButton.disabled = !cart.length;
  completeOrderButton.disabled = !cart.length;
  orderItems.innerHTML = cart.length ? cart.map((item) => `<article class="order-item"><div><p class="order-item-name">${item.name}</p><span class="order-item-price">${formatCurrency(item.price)} c/u</span><div class="quantity-control" aria-label="Cantidad de ${item.name}"><button type="button" data-action="decrease" data-product-id="${item.id}" aria-label="Quitar una unidad">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-product-id="${item.id}" aria-label="Agregar una unidad">+</button></div></div><strong class="item-subtotal">${formatCurrency(item.price * item.quantity)}</strong></article>`).join('') : '<p class="empty-state">Aún no agregaste productos al pedido.</p>';
}
function addProduct(id) {
  const product = products.find((item) => item.id === id);
  const item = cart.find((entry) => entry.id === id);
  if (item) item.quantity += 1; else cart.push({ ...product, quantity: 1 });
  orderFeedback.textContent = '';
  renderOrder();
}
function changeQuantity(id, amount) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== id);
  renderOrder();
}
async function validateSession() {
  const token = localStorage.getItem('authToken');
  if (!token) return window.location.replace('index.html');
  try {
    const data = await readResponse(await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }));
    userEmail.textContent = data.user.email;
  } catch (_error) {
    localStorage.removeItem('authToken');
    window.location.replace('index.html');
  }
}
productSearch.addEventListener('input', renderProducts);
document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    selectedFilter = button.dataset.filter;

    document.querySelectorAll('.filter-button').forEach((btn) => {
      btn.classList.remove('active');
    });

    button.classList.add('active');

    renderProducts();
  });
});
productList.addEventListener('click', (event) => { const button = event.target.closest('[data-product-id]'); if (button) addProduct(Number(button.dataset.productId)); });
orderItems.addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (button) changeQuantity(Number(button.dataset.productId), button.dataset.action === 'increase' ? 1 : -1); });
clearOrderButton.addEventListener('click', () => { cart = []; orderFeedback.textContent = ''; renderOrder(); });
completeOrderButton.addEventListener('click', () => { const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); orderFeedback.textContent = `Venta de ${formatCurrency(total)} lista para registrar en la base de datos.`; cart = []; currentOrder += 1; renderOrder(); });
document.querySelector('#logout-button').addEventListener('click', () => { localStorage.removeItem('authToken'); window.location.replace('index.html'); });
renderProducts();
renderOrder();
validateSession();
