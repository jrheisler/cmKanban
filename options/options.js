const KEY='kanban.v1'

const themeSel = document.getElementById('theme')

async function load(){
  const state = (await chrome.storage.local.get(KEY))[KEY]
  if(state){ themeSel.value = state.settings?.theme || 'dark' }
}
load()

themeSel.addEventListener('change', async ()=>{
  const state = (await chrome.storage.local.get(KEY))[KEY]
  state.settings = { ...(state.settings||{}), theme: themeSel.value }
  await chrome.storage.local.set({ [KEY]: state })
})

document.getElementById('export').addEventListener('click', async () => {
  const state = (await chrome.storage.local.get(KEY))[KEY]
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href:url, download:'kanbanx-export.json' })
  a.click(); URL.revokeObjectURL(url)
})

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if(!file) return
  const json = JSON.parse(await file.text())
  await chrome.storage.local.set({ [KEY]: json })
  alert('Imported. Open the side panel to see your board.')
})
