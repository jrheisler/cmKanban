document.addEventListener('keydown', (event) => {
  const search = document.getElementById('search');
  const activeElement = document.activeElement;

  if (event.key === '/' && activeElement !== search) {
    event.preventDefault();
    search?.focus();
    return;
  }

  if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    announce('Keyboard help coming soon.');
  }
});

function announce(message) {
  const id = 'kanbanx-announcer';
  let region = document.getElementById(id);
  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.className = 'sr-only';
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }

  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
