import { html, cardView } from './templates.js'

export function renderBoard(state, { onState }){
  const root = document.getElementById('board')
  const board = state.boards.find(b => b.id === state.activeBoardId)
  const query = (state.ui?.query || '').toLowerCase()

  root.innerHTML = board.columns
    .sort((a,b)=> a.order - b.order)
    .map(col => renderColumn(board, col, query))
    .join('')

  // wire column drop zones
  root.querySelectorAll('.card-list').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault()
      zone.classList.add('drag-over')
    })
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))
    zone.addEventListener('drop', (e) => {
      e.preventDefault()
      zone.classList.remove('drag-over')
      const cardId = e.dataTransfer.getData('text/plain')
      moveCard(board, cardId, zone.dataset.colId)
      onState(state)
    })
  })

  // wire cards as drag sources
  root.querySelectorAll('.card').forEach(cardEl => {
    cardEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', cardEl.dataset.id)
      e.dataTransfer.effectAllowed = 'move'
    })
  })

  // add card buttons
  root.querySelectorAll('.add-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const colId = btn.dataset.colId
      const id = crypto.randomUUID()
      board.cards.push({
        id, columnId: colId, title: 'New task',
        labels:[], createdAt:Date.now(), updatedAt:Date.now()
      })
      onState(state)
    })
  })
}

function renderColumn(board, col, query){
  const cards = board.cards.filter(c => c.columnId === col.id && match(c, query))
  return html`<section class="column" data-col-id="${col.id}">
    <div class="col-head">
      <div class="col-title">${col.name}</div>
      <div class="wip">${col.wip ? `${cards.length}/${col.wip}` : cards.length}</div>
    </div>
    <div class="card-list" data-col-id="${col.id}">
      ${cards.sort((a,b)=> (a.order??0)-(b.order??0)).map(cardView).join('')}
    </div>
    <button class="add-card" data-col-id="${col.id}">+ Add card</button>
  </section>`
}

function match(card, q){
  if(!q) return true
  return (card.title||'').toLowerCase().includes(q) || (card.description||'').toLowerCase().includes(q)
}

function moveCard(board, cardId, toColId){
  const c = board.cards.find(x => x.id === cardId)
  if(!c) return
  c.columnId = toColId
  c.updatedAt = Date.now()
}
