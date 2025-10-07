chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id:'kanban-add', title:'Add to KanbanX', contexts:['selection','page'] })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if(info.menuItemId !== 'kanban-add') return
  const KEY = 'kanban.v1'
  const state = (await chrome.storage.local.get(KEY))[KEY]
  if(!state) return
  const board = state.boards.find(b => b.id === state.activeBoardId)
  const id = crypto.randomUUID()
  const title = (info.selectionText?.slice(0,120) || tab?.title || 'New card')
  board.cards.push({
    id, columnId: board.columns[0].id, title,
    url: tab?.url || null,
    selection: info.selectionText || null,
    createdAt: Date.now(), updatedAt: Date.now(), labels: []
  })
  await chrome.storage.local.set({ [KEY]: state })
  try {
    chrome.notifications.create({
      type:'basic',
      iconUrl:'icons/icon128.png',
      title:'Added to KanbanX',
      message: title
    })
  } catch(e){ /* notifications permission optional */ }
})
