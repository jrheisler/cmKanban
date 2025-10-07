import { html, cardView } from './templates.js';
import { getActiveBoard, addCard, moveCard } from './state.js';

export function renderBoard(state, { onState }) {
  const root = document.getElementById('board');
  const board = getActiveBoard(state);
  if (!board) {
    root.innerHTML = '<p class="empty">No board selected.</p>';
    return;
  }

  const query = (state.ui?.query ?? '').toLowerCase();
  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);

  root.innerHTML = sortedColumns.map((column) => renderColumn(board, column, query)).join('');

  root.querySelectorAll('.card-list').forEach((zone) => {
    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', async (event) => {
      event.preventDefault();
      zone.classList.remove('drag-over');
      const cardId = event.dataTransfer.getData('text/plain');
      const columnId = zone.dataset.colId;
      if (!cardId || !columnId) return;
      await onState((current) => moveCard(current, cardId, columnId));
    });
  });

  root.querySelectorAll('.card').forEach((cardEl) => {
    cardEl.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', cardEl.dataset.id);
      event.dataTransfer.effectAllowed = 'move';
    });
  });

  root.querySelectorAll('.add-card').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId) return;
      const nextCard = {
        id: crypto.randomUUID(),
        columnId,
        title: 'New task',
        labels: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await onState((current) => addCard(current, nextCard));
    });
  });
}

function renderColumn(board, column, query) {
  const visibleCards = board.cards
    .filter((card) => card.columnId === column.id && matchesQuery(card, query))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const wipText = column.wip ? `${visibleCards.length} / ${column.wip}` : `${visibleCards.length}`;
  const wipAccessible = column.wip
    ? `Cards in column: ${visibleCards.length} of ${column.wip}`
    : `Cards in column: ${visibleCards.length}`;

  return html`<section
      class="column"
      data-col-id="${column.id}"
      role="region"
      aria-labelledby="col-${column.id}"
    >
      <div class="col-head">
        <div class="col-title" id="col-${column.id}">${column.name}</div>
        <div class="wip" aria-hidden="true">${wipText}</div>
        <span class="sr-only">${wipAccessible}</span>
      </div>
      <div class="card-list" data-col-id="${column.id}" role="list">
        ${visibleCards.map((card) => cardView(card)).join('')}
      </div>
      <button class="add-card" data-col-id="${column.id}">+ Add card</button>
    </section>`;
}

function matchesQuery(card, query) {
  if (!query) return true;
  const haystack = `${card.title ?? ''} ${card.description ?? ''}`.toLowerCase();
  return haystack.includes(query);
}
