const KEY = 'kanban.v1'

export async function loadState(){
  const { [KEY]: data } = await chrome.storage.local.get(KEY)
  return data || null
}

export async function saveState(state){
  await chrome.storage.local.set({ [KEY]: state })
}

export async function initDefault(){
  const defaultBoard = {
    version: 1,
    boards: [{
      id: 'default',
      name: 'My Board', // We'll add naming UX later
      labels: [],
      columns: [
        { id: 'c1', name: 'Backlog', wip: null, order: 0 },
        { id: 'c2', name: 'Doing',   wip: 2,    order: 1 },
        { id: 'c3', name: 'Done',    wip: null, order: 2 }
      ],
      cards: []
    }],
    activeBoardId: 'default',
    settings: { theme: 'dark', compact: false },
    ui: { query: '' }
  }
  await saveState(defaultBoard)
  return defaultBoard
}
