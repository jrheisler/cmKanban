import {
  loadState,
  saveState,
  initDefault,
  getActiveBoard,
  addColumn,
  withState,
  addBoard,
  setActiveBoard,
  renameBoard,
  removeBoard
} from './state.js';
import { renderBoard } from './board.js';
import { escapeHtml } from './templates.js';
import { openCardDetails, syncCardDetails, closeCardDetails } from './details.js';
import './keyboard.js';
import { connectDrive, isDriveConnected, listDriveAppDataFiles } from './drive.js';

const elSearch = document.getElementById('search');
const elAddColumn = document.getElementById('addColumn');
const elBoardSelect = document.getElementById('boardSelect');
const elAddBoard = document.getElementById('addBoard');
const elRenameBoard = document.getElementById('renameBoard');
const elDeleteBoard = document.getElementById('deleteBoard');
const elNotice = document.getElementById('notice');
const elConnectDrive = document.getElementById('connectDrive');
const elHeader = document.querySelector('header');

const rootStyle = document.documentElement?.style ?? null;

const updateLayoutMetrics = () => {
  if (!rootStyle) return;
  const headerHeight = elHeader?.offsetHeight ?? 0;
  const noticeVisible = Boolean(elNotice?.textContent?.trim());
  const noticeHeight = noticeVisible ? (elNotice?.offsetHeight ?? 0) : 0;
  const offset = headerHeight + noticeHeight;
  rootStyle.setProperty('--app-header-offset', `${offset}px`);
};

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

let state = await loadState();
if (!state) {
  state = await initDefault();
}

const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(updateLayoutMetrics) : null;
if (resizeObserver) {
  if (elHeader) resizeObserver.observe(elHeader);
  if (elNotice) resizeObserver.observe(elNotice);
}
window.addEventListener('resize', updateLayoutMetrics, { passive: true });

render();
updateDriveButton();
updateLayoutMetrics();

elSearch.addEventListener('input', (event) => {
  state = withState(state, (draft) => {
    draft.ui = { ...(draft.ui ?? {}), query: event.target.value };
  });
  render();
});

elAddColumn.addEventListener('click', () => {
  const board = getActiveBoard(state);
  const nextColumn = {
    id: createId(),
    name: 'New',
    wip: null,
    order: board ? board.columns.length : 0
  };
  onState((current) => addColumn(current, nextColumn));
});

if (elConnectDrive) {
  elConnectDrive.addEventListener('click', async () => {
    await updateDriveButton({ connecting: true });
    try {
      await listDriveAppDataFiles({ interactive: true });
      await connectDrive(state);
      await saveState(state);
      showNotice('Connected to Google Drive. Boards will sync automatically.', 'success');
    } catch (error) {
      console.error('KanbanX: unable to connect to Google Drive', error);
      const message =
        error?.message && typeof error.message === 'string'
          ? error.message
          : 'Unable to connect to Google Drive. Please try again.';
      showNotice(message, 'danger');
    } finally {
      await updateDriveButton();
    }
  });
}

elBoardSelect.addEventListener('change', () => {
  const nextId = elBoardSelect.value;
  closeCardDetails();
  onState((current) => setActiveBoard(current, nextId));
});

elAddBoard.addEventListener('click', () => {
  const name = prompt('Board name', 'New board');
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  closeCardDetails();
  onState((current) => addBoard(current, trimmed));
  showNotice('Board created.', 'success');
});

elRenameBoard.addEventListener('click', () => {
  const board = getActiveBoard(state);
  if (!board) return;
  const name = prompt('Rename board', board.name);
  if (!name || !name.trim()) return;
  onState((current) => renameBoard(current, board.id, name.trim()));
  showNotice('Board renamed.', 'success');
});

elDeleteBoard.addEventListener('click', () => {
  const board = getActiveBoard(state);
  if (!board) return;
  if ((state.boards ?? []).length <= 1) {
    showNotice('Keep at least one board.', 'danger');
    return;
  }
  if (!confirm(`Delete "${board.name}"? Cards will be removed.`)) return;
  closeCardDetails();
  onState((current) => removeBoard(current, board.id));
  showNotice('Board deleted.', 'danger');
});

function render() {
  elSearch.value = state.ui?.query ?? '';
  renderBoard(state, {
    onState,
    onOpenCard: (cardId) => {
      openCardDetails(cardId, { onState, notify: showNotice });
      syncCardDetails(state, { onState, notify: showNotice });
    },
    announce: showNotice
  });
  renderBoardControls();
  syncCardDetails(state, { onState, notify: showNotice });
  updateLayoutMetrics();
}

async function onState(updater) {
  state = typeof updater === 'function' ? updater(state) : updater;
  await saveState(state);
  render();
}

async function updateDriveButton({ connecting = false } = {}) {
  if (!elConnectDrive) return;
  if (connecting) {
    elConnectDrive.disabled = true;
    elConnectDrive.textContent = 'Connecting…';
    return;
  }
  const connected = await isDriveConnected();
  if (connected) {
    elConnectDrive.disabled = true;
    elConnectDrive.textContent = 'G-Drive Connected';
  } else {
    elConnectDrive.disabled = false;
    elConnectDrive.textContent = 'Connect to G-Drive';
  }
}

function renderBoardControls() {
  const boards = state.boards ?? [];
  elBoardSelect.innerHTML = boards
    .map((board) => `<option value="${board.id}">${escapeHtml(board.name ?? 'Untitled')}</option>`)
    .join('');
  const activeId = state.activeBoardId ?? boards[0]?.id ?? '';
  elBoardSelect.value = activeId;
  elBoardSelect.disabled = boards.length === 0;
  elRenameBoard.disabled = !activeId;
  elDeleteBoard.disabled = boards.length <= 1;
}

let noticeTimer = null;
function showNotice(message, variant = 'info') {
  if (!elNotice) return;
  if (noticeTimer) {
    clearTimeout(noticeTimer);
    noticeTimer = null;
  }
  if (!message) {
    elNotice.textContent = '';
    elNotice.removeAttribute('data-variant');
    updateLayoutMetrics();
    return;
  }
  elNotice.textContent = message;
  if (variant === 'danger' || variant === 'success') {
    elNotice.dataset.variant = variant;
  } else {
    elNotice.removeAttribute('data-variant');
  }
  updateLayoutMetrics();
  noticeTimer = setTimeout(() => {
    elNotice.textContent = '';
    elNotice.removeAttribute('data-variant');
    updateLayoutMetrics();
  }, 4000);
}
