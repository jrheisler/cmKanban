import { loadState, initDefault, saveState, updateSettings } from '../sidepanel/state.js';

const exportButton = document.getElementById('export');
const importInput = document.getElementById('import');
const themeSelect = document.getElementById('theme');

(async function initialise() {
  let state = await loadState();
  if (!state) {
    state = await initDefault();
  }

  themeSelect.value = state.settings?.theme ?? 'dark';
})();

themeSelect.addEventListener('change', async () => {
  let state = await loadState();
  if (!state) {
    state = await initDefault();
  }
  state = updateSettings(state, { theme: themeSelect.value });
  await saveState(state);
});

exportButton.addEventListener('click', async () => {
  let state = await loadState();
  if (!state) {
    state = await initDefault();
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), {
    href: url,
    download: 'kanbanx-export.json'
  });
  anchor.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', async (event) => {
  const [file] = event.target.files ?? [];
  if (!file) return;

  try {
    const json = JSON.parse(await file.text());
    await saveState(json);
    alert('Imported. Open the side panel to see your board.');
    themeSelect.value = json?.settings?.theme ?? 'dark';
  } catch (error) {
    console.error('Failed to import Kanban data', error);
    alert('Import failed. Please select a valid kanban-export.json file.');
  } finally {
    importInput.value = '';
  }
});
