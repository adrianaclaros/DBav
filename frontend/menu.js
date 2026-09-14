// MENÚ LATERAL GLOBAL

document.addEventListener('DOMContentLoaded', () => {

  const menuToggle = document.getElementById('menu-toggle');
  const sideMenu = document.getElementById('side-menu');
  const menuClose = document.getElementById('menu-close');
  const menuOverlay = document.getElementById('menu-overlay');
  const logoutButton = document.getElementById('logout-button');


  // ABRIR MENÚ

  function openMenu() {
    if (!sideMenu || !menuOverlay) return;

    sideMenu.classList.add('open');
    menuOverlay.classList.add('open');

    menuToggle?.setAttribute('aria-expanded', 'true');
    sideMenu.setAttribute('aria-hidden', 'false');

    document.body.classList.add('menu-open');
  }


  // CERRAR MENÚ

  function closeMenu() {
    if (!sideMenu || !menuOverlay) return;

    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('open');

    menuToggle?.setAttribute('aria-expanded', 'false');
    sideMenu.setAttribute('aria-hidden', 'true');

    document.body.classList.remove('menu-open');
  }


  // CERRAR SESIÓN

  function logout() {
    localStorage.removeItem('authToken');

    // Ir directamente a la pantalla de inicio de sesión
    window.location.replace('index.html');
  }


  // EVENTOS

  menuToggle?.addEventListener('click', openMenu);

  menuClose?.addEventListener('click', closeMenu);

  menuOverlay?.addEventListener('click', closeMenu);

  logoutButton?.addEventListener('click', logout);


  // Cerrar el menú con ESC

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

});