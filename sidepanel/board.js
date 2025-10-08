import { html, cardView } from './templates.js';
import {
  getActiveBoard,
  addCard,
  moveCard,
  columnCardCount,
  renameColumn,
  removeColumn,
  setColumnLimit,
  moveColumn as shiftColumn
} from './state.js';

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
  const sortedColumns = [...board.columns].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  root.innerHTML = sortedColumns
    .map((column, index) => renderColumn(board, column, query, index, sortedColumns.length))
    .join('');

  const getDropZone = (element) => {
    if (!(element instanceof HTMLElement)) return null;
    if (element.classList.contains('card-list')) {
      return element;
    }
    const column = element.closest('.column');
    if (column) {
      const list = column.querySelector('.card-list');
      if (list instanceof HTMLElement) {
        return list;
      }
    }
    const wrapper = element.closest('.column-wrapper');
    if (!wrapper) return null;
    const list = wrapper.querySelector('.column .card-list');
    return list instanceof HTMLElement ? list : null;
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const zone = getDropZone(event.currentTarget);
    if (!zone) return;
    zone.classList.remove('drag-over');

    const dataTransfer = event.dataTransfer;
    const cardId = dataTransfer?.getData('text/plain');
    const columnId = zone.dataset.colId;
    if (!cardId || !columnId) return;

    const cards = Array.isArray(board.cards) ? board.cards : [];
    const columns = Array.isArray(board.columns) ? board.columns : [];

    const card = cards.find((item) => item.id === cardId);
    const targetColumn = columns.find((col) => col.id === columnId);
    if (!card || !targetColumn) return;

    const sameColumn = card.columnId === columnId;
    const limit = targetColumn.wip;
    let overLimit = false;
    if (
      !sameColumn &&
      typeof limit === 'number' &&
      limit !== null &&
      columnCardCount(board, columnId, cardId) + 1 > limit
    ) {
      overLimit = true;
    }

    await onState((current) => moveCard(current, cardId, columnId));

    if (overLimit && typeof announce === 'function') {
      announce(
        `Moved to ${targetColumn.name}. WIP limit of ${limit} exceeded.`,
        'danger'
      );
    }

    if (dataTransfer) {
      dataTransfer.dropEffect = 'move';
    }
  };

  const allowDrop = (event) => {
    event.preventDefault();
    const zone = getDropZone(event.currentTarget);
    if (zone) {
      zone.classList.add('drag-over');
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (event) => {
    const zone = getDropZone(event.currentTarget);
    if (!zone) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement) {
      const column = zone.closest('.column');
      if (column?.contains(nextTarget)) {
        return;
      }
      const wrapper = zone.closest('.column-wrapper');
      if (wrapper?.contains(nextTarget)) {
        return;
      }
    }
    zone.classList.remove('drag-over');
  };

  root.querySelectorAll('.card-list').forEach((zone) => {
    zone.addEventListener('dragenter', allowDrop);
    zone.addEventListener('dragover', allowDrop);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
  });

  root.querySelectorAll('.column').forEach((columnEl) => {
    columnEl.addEventListener('dragenter', allowDrop);
    columnEl.addEventListener('dragover', allowDrop);
    columnEl.addEventListener('dragleave', handleDragLeave);
    columnEl.addEventListener('drop', handleDrop);
  });

  root.querySelectorAll('.column-wrapper').forEach((wrapper) => {
    wrapper.addEventListener('dragenter', allowDrop);
    wrapper.addEventListener('dragover', allowDrop);
    wrapper.addEventListener('dragleave', handleDragLeave);
    wrapper.addEventListener('drop', handleDrop);
  });

  root.querySelectorAll('.card').forEach((cardEl) => {
    cardEl.addEventListener('dragstart', (event) => {
      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;
      dataTransfer.setData('text/plain', cardEl.dataset.id ?? '');
      dataTransfer.effectAllowed = 'move';
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

  root.querySelectorAll('.col-rename').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId) return;
      const column = board.columns.find((col) => col.id === columnId);
      const name = prompt('Rename column', column?.name ?? 'Column');
      if (name === null) return;
      const trimmed = name.trim();
      if (!trimmed) {
        if (typeof announce === 'function') {
          announce('Column name cannot be empty.', 'danger');
        }
        return;
      }
      await onState((current) => renameColumn(current, columnId, trimmed));
      if (typeof announce === 'function') {
        announce('Column renamed.', 'success');
      }
    });
  });

  root.querySelectorAll('.col-limit').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId) return;
      const column = board.columns.find((col) => col.id === columnId);
      const currentLimit =
        typeof column?.wip === 'number' && !Number.isNaN(column.wip) ? column.wip : '';
      const input = prompt('Set max cards (leave blank for no limit)', `${currentLimit}`);
      if (input === null) return;
      const trimmed = input.trim();
      let limit = null;
      if (trimmed !== '') {
        const parsed = Number.parseInt(trimmed, 10);
        if (Number.isNaN(parsed) || parsed < 0) {
          if (typeof announce === 'function') {
            announce('Enter a whole number that is zero or greater.', 'danger');
          }
          return;
        }
        limit = parsed;
      }
      await onState((current) => setColumnLimit(current, columnId, limit));
      if (typeof announce === 'function') {
        if (limit === null) {
          announce('Column limit cleared.', 'success');
        } else {
          announce(`Column limit set to ${limit}.`, 'success');
        }
      }
    });
  });

  root.querySelectorAll('.col-delete').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId) return;
      if (!Array.isArray(board.columns) || board.columns.length <= 1) {
        if (typeof announce === 'function') {
          announce('Keep at least one column.', 'danger');
        }
        return;
      }
      const column = board.columns.find((col) => col.id === columnId);
      const name = column?.name ?? 'column';
      if (!confirm(`Delete "${name}"? Cards in this column will be removed.`)) return;
      await onState((current) => removeColumn(current, columnId));
      if (typeof announce === 'function') {
        announce('Column deleted.', 'danger');
      }
    });
  });

  root.querySelectorAll('.col-move-left').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId || button.disabled) return;
      await onState((current) => shiftColumn(current, columnId, -1));
    });
  });

  root.querySelectorAll('.col-move-right').forEach((button) => {
    button.addEventListener('click', async () => {
      const columnId = button.dataset.colId;
      if (!columnId || button.disabled) return;
      await onState((current) => shiftColumn(current, columnId, 1));
    });
  });

  const applyTopCardOffset = () => {
    const lists = root.querySelectorAll('.card-list');
    lists.forEach((list) => {
      if (!(list instanceof HTMLElement)) return;
      const firstCard = list.querySelector('.card');
      if (firstCard instanceof HTMLElement) {
        const { height } = firstCard.getBoundingClientRect();
        list.style.setProperty('--first-card-offset', `${height}px`);
      } else {
        list.style.setProperty('--first-card-offset', '0px');
      }
    });
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(applyTopCardOffset);
  } else {
    applyTopCardOffset();
  }
}

function renderColumn(board, column, query, index, totalColumns) {
  const cards = Array.isArray(board.cards) ? board.cards : [];
  const visibleCards = cards
    .filter((card) => card.columnId === column.id && matchesQuery(card, query))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const totalCards = columnCardCount(board, column.id);
  const visibleCount = visibleCards.length;
  const filterActive = query.length > 0 && visibleCount !== totalCards;
  const hasLimit = typeof column.wip === 'number' && !Number.isNaN(column.wip);
  const wipBaseText = hasLimit ? `${totalCards} / ${column.wip}` : `${totalCards}`;
  const wipText = filterActive ? `${wipBaseText} (${visibleCount} shown)` : wipBaseText;
  let wipAccessible = hasLimit
    ? `Cards in column: ${totalCards} of ${column.wip}`
    : `Cards in column: ${totalCards}`;
  if (filterActive) {
    wipAccessible += `. ${visibleCount} shown with current search.`;
  }

  const disableLeft = index === 0 ? 'disabled' : '';
  const disableRight = index === totalColumns - 1 ? 'disabled' : '';

  const showAddCardButton = index === 0;
  const addCardButton = showAddCardButton
    ? html`<button class="add-card" data-col-id="${column.id}">+ Add card</button>`
    : '';

  return html`<article class="column-wrapper">
      <div class="col-head">
        <div class="col-head-inner">
          <div class="col-title" id="col-${column.id}">${column.name}</div>
          <div class="wip" aria-hidden="true">${wipText}</div>
          <div class="col-actions" role="group" aria-label="Column actions">
            <button
              class="icon-button col-move-left"
              data-col-id="${column.id}"
              ${disableLeft}
              title="Move column left"
              aria-label="Move column left"
            >
              <span aria-hidden="true">◀</span>
            </button>
            <button
              class="icon-button col-move-right"
              data-col-id="${column.id}"
              ${disableRight}
              title="Move column right"
              aria-label="Move column right"
            >
              <span aria-hidden="true">▶</span>
            </button>
            <button
              class="icon-button col-rename"
              data-col-id="${column.id}"
              title="Rename column"
              aria-label="Rename column"
            >
              <span aria-hidden="true">✏️</span>
            </button>
            <button
              class="icon-button col-limit"
              data-col-id="${column.id}"
              title="Set max cards"
              aria-label="Set max cards"
            >
              <span aria-hidden="true">#</span>
            </button>
            <button
              class="icon-button col-delete"
              data-col-id="${column.id}"
              title="Delete column"
              aria-label="Delete column"
            >
              <span aria-hidden="true">🗑️</span>
            </button>
          </div>
          <span class="sr-only">${wipAccessible}</span>
        </div>
      </div>
      <section
        class="column"
        data-col-id="${column.id}"
        role="region"
        aria-labelledby="col-${column.id}"
      >
        <div class="card-list" data-col-id="${column.id}" role="list">
          ${visibleCards.map((card) => cardView(card)).join('')}
        </div>
        ${addCardButton}
      </section>
    </article>`;
}

function matchesQuery(card, query) {
  if (!query) return true;
  const haystack = `${card.title ?? ''} ${card.description ?? ''}`.toLowerCase();
  return haystack.includes(query);
}
