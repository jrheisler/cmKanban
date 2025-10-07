import { loadState, saveState } from '../sidepanel/state.js'

document.getElementById('save').addEventListener('click', async () => {
  const [{ url, title: tabTitle } = {}, state] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }).then(t => t[0] || {}),
    loadState()
  ])
  const b = state.boards.find(x => x.id === state.activeBoardId)
  const id = crypto.randomUUID()
  const title = document.getElementById('title').value || tabTitle || 'New card'
  const attach = document.getElementById('attach').checked
  b.cards.push({
    id, columnId: b.columns[0].id, title,
    url: attach ? url : null,
    createdAt: Date.now(), updatedAt: Date.now(), labels: []
  })
  await saveState(state)
  window.close()
})
