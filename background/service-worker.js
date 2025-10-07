import {
  loadState,
  initDefault,
  saveState,
  addCard,
  getActiveBoard,
  columnCardCount
} from '../sidepanel/state.js';

console.log('EXT_ID', chrome.runtime.id);

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

  const firstColumn = board.columns.find((column) => column.id === firstColumnId);
  const limit = firstColumn?.wip;
  if (typeof limit === 'number' && limit !== null) {
    const count = columnCardCount(board, firstColumnId);
    if (count + 1 > limit) {
      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'KanbanX',
          message: `${firstColumn?.name ?? 'Column'} is at its WIP limit.`
        });
      } catch (error) {
        console.info('KanbanX: WIP notification skipped', error);
      }
      return;
    }
  }

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

chrome.action.onClicked.addListener(async (tab) => {
  let openedSidePanel = false;

  if (tab?.windowId !== undefined && chrome?.sidePanel?.open) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      openedSidePanel = true;
    } catch (error) {
      console.warn('KanbanX: unable to open side panel from action', error);
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
});
