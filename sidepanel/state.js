export const KEY = 'kanban.v1';

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

export async function loadState() {
  const { [KEY]: data } = await chrome.storage.local.get(KEY);
  return data ?? null;
}

export async function saveState(state) {
  await chrome.storage.local.set({ [KEY]: state });
}

export async function initDefault() {
  const existing = await loadState();
  if (existing) {
    return existing;
  }

  const seeded = createDefaultState();
  await saveState(seeded);
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

export function addColumn(state, column) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    board.columns.push({ ...column });
  });
}

export function addCard(state, card) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
    board.cards.push({ ...card });
  });
}

export function moveCard(state, cardId, toColumnId) {
  return withState(state, (draft) => {
    const board = getActiveBoard(draft);
    if (!board) return;
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
