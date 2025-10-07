import { loadState, initDefault, saveState, addCard, getActiveBoard } from '../sidepanel/state.js';

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.contextMenus.removeAll();
  } catch (error) {
    console.warn('KanbanX: unable to reset context menus', error);
  }

  chrome.contextMenus.create({
    id: 'kanban-add',
    title: 'Add to KanbanX',
    contexts: ['selection', 'page']
  });

  await initDefault();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'kanban-add') return;

  let state = await loadState();
  if (!state) {
    state = await initDefault();
  }

  const board = getActiveBoard(state);
  const firstColumnId = board?.columns?.[0]?.id;
  if (!board || !firstColumnId) return;

  const title = (info.selectionText?.slice(0, 120) || tab?.title || 'New card').trim();
  const nextCard = {
    id: crypto.randomUUID(),
    columnId: firstColumnId,
    title,
    url: tab?.url ?? null,
    selection: info.selectionText || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    labels: []
  };

  state = addCard(state, nextCard);
  await saveState(state);

  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Added to KanbanX',
      message: title
    });
  } catch (error) {
    console.info('Notification skipped', error);
  }
});
