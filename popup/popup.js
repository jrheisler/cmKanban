import { loadState, initDefault, saveState, addCard, getActiveBoard } from '../sidepanel/state.js';

document.getElementById('save').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let state = await loadState();
  if (!state) {
    state = await initDefault();
  }

  const board = getActiveBoard(state);
  const firstColumnId = board?.columns?.[0]?.id;
  if (!board || !firstColumnId) {
    window.close();
    return;
  }

  const titleField = document.getElementById('title');
  const attachCheckbox = document.getElementById('attach');
  const title = titleField.value.trim() || tab?.title || 'New card';
  const attach = attachCheckbox.checked;

  const nextCard = {
    id: crypto.randomUUID(),
    columnId: firstColumnId,
    title,
    url: attach ? tab?.url ?? null : null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    labels: []
  };

  state = addCard(state, nextCard);
  await saveState(state);
  window.close();
});
