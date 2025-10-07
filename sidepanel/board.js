import { html, cardView } from './templates.js';
import { getActiveBoard, addCard, moveCard, columnCardCount } from './state.js';

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

export function renderBoard(state, { onState, onOpenCard, announce }) {
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
      const card = board.cards.find((item) => item.id === cardId);
      const targetColumn = board.columns.find((col) => col.id === columnId);
      if (!card || !targetColumn) return;
      const sameColumn = card.columnId === columnId;
      const limit = targetColumn.wip;
      if (
        !sameColumn &&
        typeof limit === 'number' &&
        limit !== null &&
        columnCardCount(board, columnId, cardId) + 1 > limit
      ) {
        if (typeof announce === 'function') {
          announce(`Cannot move to ${targetColumn.name}. WIP limit reached.`, 'danger');
        }
        return;
      }
      await onState((current) => moveCard(current, cardId, columnId));
    });
  });

  root.querySelectorAll('.card').forEach((cardEl) => {
    cardEl.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', cardEl.dataset.id);
      event.dataTransfer.effectAllowed = 'move';
    });

    cardEl.addEventListener('click', () => {
      if (typeof onOpenCard === 'function') {
        onOpenCard(cardEl.dataset.id);
      }
    });

    cardEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (typeof onOpenCard === 'function') {
          onOpenCard(cardEl.dataset.id);
        }
      }
    });
  });

  root.querySelectorAll('.add-card').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId) return;
      const column = board.columns.find((col) => col.id === columnId);
      const limit = column?.wip;
      if (typeof limit === 'number' && limit !== null) {
        const count = columnCardCount(board, columnId);
        if (count + 1 > limit) {
          if (typeof announce === 'function') {
            announce(`Cannot add card. ${column?.name ?? 'Column'} is at WIP limit.`, 'danger');
          }
          return;
        }
      }
      const nextCard = {
        id: createId(),
        columnId,
        title: 'New task',
        labels: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await onState((current) => addCard(current, nextCard));
      if (typeof announce === 'function') {
        announce(`Card added to ${column?.name ?? 'column'}.`, 'success');
      }
    });
  });
}

function renderColumn(board, column, query) {
  const cards = Array.isArray(board.cards) ? board.cards : [];
  const visibleCards = cards
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
