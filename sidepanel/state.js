import { loadStateFromDrive, saveStateToDrive } from './drive.js';

export const KEY = 'kanban.v1';
const SETTINGS_KEY = 'kanban.settings.v1';

const uuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

export async function loadState() {
  const localStatePromise = chrome.storage.local.get(KEY);
  const settingsPromise = loadSettings();
  const driveState = await loadStateFromDrive();

  const stored = await localStatePromise;
  const data = stored?.[KEY] ?? null;
  let state = driveState ?? data ?? null;

  if (driveState) {
    try {
      await chrome.storage.local.set({ [KEY]: driveState });
    } catch (error) {
      console.warn('KanbanX: unable to persist Drive state locally', error);
    }
  }

  const settings = await settingsPromise;
  if (state && settings) {
    state.settings = { ...(state.settings ?? {}), ...settings };
  }

  return state;
}

export async function saveState(state) {
  await chrome.storage.local.set({ [KEY]: state });
  await saveSettings(state.settings ?? {});
  await saveStateToDrive(state);
}

export async function initDefault() {
  const existing = await loadState();
  if (existing) {
    return existing;
  }

  const seeded = createDefaultState();
  await chrome.storage.local.set({ [KEY]: seeded });
  await saveSettings(seeded.settings);
  return seeded;
}

export function getActiveBoard(state) {
  return state.boards.find((board) => board.id === state.activeBoardId);
}

export function withState(state, updater) {
  const next = clone(state);
  updater(next);
  return next;
}

export function setActiveBoard(state, boardId) {
  return withState(state, (draft) => {
    if (!draft.boards.some((board) => board.id === boardId)) return;
    draft.activeBoardId = boardId;
  });
}

export function addBoard(state, name) {
  return withState(state, (draft) => {
    const next = createBoardTemplate(name);
    draft.boards.push(next);
    draft.activeBoardId = next.id;
  });
}

export function renameBoard(state, boardId, nextName) {
  return withState(state, (draft) => {
    const board = draft.boards.find((item) => item.id === boardId);
    if (!board) return;
    board.name = nextName;
  });
}

export function removeBoard(state, boardId) {
  return withState(state, (draft) => {
    if (draft.boards.length <= 1) return;
    draft.boards = draft.boards.filter((board) => board.id !== boardId);
    if (draft.activeBoardId === boardId) {
      draft.activeBoardId = draft.boards[0]?.id ?? null;
    }
  });
}

export function addColumn(state, column) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.columns)) {
      board.columns = [];
    }
    const nextColumn = { ...column, order: -1 };
    board.columns.unshift(nextColumn);
    normalizeColumnOrder(board);
  });
}

export function renameColumn(state, columnId, nextName) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    const column = board.columns.find((item) => item.id === columnId);
    if (!column) return;
    column.name = nextName;
  });
}

export function setColumnLimit(state, columnId, limit) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    const column = board.columns.find((item) => item.id === columnId);
    if (!column) return;
    column.wip = typeof limit === 'number' ? limit : null;
  });
}

export function removeColumn(state, columnId) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.columns) || board.columns.length <= 1) return;
    board.columns = board.columns.filter((column) => column.id !== columnId);
    if (Array.isArray(board.cards)) {
      board.cards = board.cards.filter((card) => card.columnId !== columnId);
    }
    normalizeColumnOrder(board);
  });
}

export function moveColumn(state, columnId, offset) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.columns) || board.columns.length <= 1) return;
    normalizeColumnOrder(board);
    const currentIndex = board.columns.findIndex((column) => column.id === columnId);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + offset;
    if (targetIndex < 0 || targetIndex >= board.columns.length) return;
    const [column] = board.columns.splice(currentIndex, 1);
    board.columns.splice(targetIndex, 0, column);
    column.order = targetIndex;
    normalizeColumnOrder(board);
  });
}

export function addCard(state, card) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.cards)) {
      board.cards = [];
    }
    board.cards.push({ ...applyCardDefaults(card) });
  });
}

export function updateCard(state, cardId, updater) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.cards)) {
      board.cards = [];
    }
    const card = board.cards.find((item) => item.id === cardId);
    if (!card) return;
    const defaults = applyCardDefaults({});
    Object.keys(defaults).forEach((key) => {
      if (typeof card[key] === 'undefined') {
        card[key] = defaults[key];
      }
    });
    if (typeof updater === 'function') {
      updater(card);
    } else {
      Object.assign(card, updater);
    }
    card.updatedAt = Date.now();
  });
}

export function removeCard(state, cardId) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.cards)) {
      board.cards = [];
      return;
    }
    board.cards = board.cards.filter((card) => card.id !== cardId);
  });
}

export function moveCard(state, cardId, toColumnId) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    if (!Array.isArray(board.cards)) {
      board.cards = [];
    }
    const card = board.cards.find((item) => item.id === cardId);
    if (!card) return;
    card.columnId = toColumnId;
    card.updatedAt = Date.now();
  });
}

export function updateSettings(state, partial) {
  return withState(state, (draft) => {
    draft.settings = { ...(draft.settings ?? {}), ...partial };
  });
}

export function columnCardCount(board, columnId, excludeCardId) {
  const cards = Array.isArray(board.cards) ? board.cards : [];
  return cards.filter((card) => {
    if (excludeCardId && card.id === excludeCardId) return false;
    return card.columnId === columnId;
  }).length;
}

function applyCardDefaults(card) {
  return {
    description: '',
    labels: [],
    dueDate: null,
    checklist: [],
    attachments: [],
    ...card
  };
}

function normalizeColumnOrder(board) {
  if (!board || !Array.isArray(board.columns)) return;
  board.columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  board.columns.forEach((column, index) => {
    column.order = index;
  });
}

async function loadSettings() {
  try {
    if (!chrome?.storage?.sync) return null;
    const { [SETTINGS_KEY]: settings } = await chrome.storage.sync.get(SETTINGS_KEY);
    return settings ?? null;
  } catch (error) {
    console.warn('KanbanX: unable to load synced settings', error);
    return null;
  }
}

async function saveSettings(settings) {
  if (!settings || !chrome?.storage?.sync) return;
  try {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    console.warn('KanbanX: unable to persist settings to sync storage', error);
  }
}

function createBoardTemplate(name = 'New board') {
  return {
    id: uuid(),
    name,
    labels: [],
    columns: [
      { id: uuid(), name: 'Backlog', wip: null, order: 0 },
      { id: uuid(), name: 'Doing', wip: 2, order: 1 },
      { id: uuid(), name: 'Done', wip: null, order: 2 }
    ],
    cards: []
  };
}

function createDefaultState() {
  return {
    version: 1,
    boards: [
      {
        id: 'default',
        name: 'My Board',
        labels: [],
        columns: [
          { id: 'c1', name: 'Backlog', wip: null, order: 0 },
          { id: 'c2', name: 'Doing', wip: 2, order: 1 },
          { id: 'c3', name: 'Done', wip: null, order: 2 }
        ],
        cards: []
      }
    ],
    activeBoardId: 'default',
    settings: { theme: 'dark', compact: false },
    ui: { query: '' }
  };
}
