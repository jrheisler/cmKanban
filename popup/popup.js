import {
  loadState,
  initDefault,
  saveState,
  addCard,
  getActiveBoard,
  columnCardCount
} from '../sidepanel/state.js';

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

  const firstColumn = board.columns.find((column) => column.id === firstColumnId);
  const limit = firstColumn?.wip;
  if (typeof limit === 'number' && limit !== null) {
    const count = columnCardCount(board, firstColumnId);
    if (count + 1 > limit) {
      alert(`Cannot add card. "${firstColumn?.name ?? 'Column'}" is at its WIP limit.`);
      window.close();
      return;
    }
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

document.getElementById('open-board').addEventListener('click', async () => {
  let openedSidePanel = false;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.windowId !== undefined && chrome?.sidePanel?.open) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      openedSidePanel = true;
    } catch (error) {
      console.warn('KanbanX: unable to open side panel', error);
    }
  } else {
    console.warn('KanbanX: side panel API unavailable');
  }

  if (!openedSidePanel) {
    const boardUrl = chrome.runtime.getURL('sidepanel/index.html');
    try {
      await chrome.tabs.create({ url: boardUrl });
    } catch (error) {
      console.error('KanbanX: unable to open board fallback tab', error);
    }
  }

  window.close();
});
