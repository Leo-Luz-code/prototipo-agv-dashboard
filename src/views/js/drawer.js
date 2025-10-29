document.addEventListener('DOMContentLoaded', () => {
  const drawerToggle = document.getElementById('drawer-toggle');
  const leftDrawer = document.getElementById('left-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawerLinkSensors = document.getElementById('drawer-link-sensors');

  function openDrawer() {
    if (leftDrawer) {
      leftDrawer.classList.add('open');
      leftDrawer.setAttribute('aria-hidden', 'false');
    }
    if (drawerToggle) drawerToggle.setAttribute('aria-expanded', 'true');
    if (drawerOverlay) drawerOverlay.classList.add('visible');
  }

  function closeDrawer() {
    if (leftDrawer) {
      leftDrawer.classList.remove('open');
      leftDrawer.setAttribute('aria-hidden', 'true');
    }
    if (drawerToggle) drawerToggle.setAttribute('aria-expanded', 'false');
    if (drawerOverlay) drawerOverlay.classList.remove('visible');
  }

  function toggleDrawer() {
    if (leftDrawer && leftDrawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  }

  if (drawerToggle) {
    drawerToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDrawer();
    });
  }

  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  // Keyboard: Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  if (drawerLinkSensors) {
    drawerLinkSensors.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      const sensorsEl = document.getElementById('sensors-card');
      if (sensorsEl) sensorsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
});
