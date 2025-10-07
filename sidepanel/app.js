import { loadState, saveState, initDefault } from './state.js'
import { renderBoard } from './board.js'
import './keyboard.js'

const elBoard = document.getElementById('board')
const elSearch = document.getElementById('search')
const elAddColumn = document.getElementById('addColumn')

let state = await loadState() || await initDefault()
renderBoard(state, { onState })

elSearch.addEventListener('input', (e) => {
  state.ui = { ...(state.ui||{}), query: e.target.value }
  renderBoard(state, { onState })
})

elAddColumn.addEventListener('click', () => {
  const b = currentBoard()
  const id = crypto.randomUUID()
  b.columns.push({ id, name: 'New', wip: null, order: b.columns.length })
  onState(state)
})

function currentBoard(){
  return state.boards.find(b => b.id === state.activeBoardId)
}

async function onState(next){
  state = next
  await saveState(state)
  renderBoard(state, { onState })
}
