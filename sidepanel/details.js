import { escapeHtml } from './templates.js';
import { getActiveBoard, updateCard, removeCard } from './state.js';
import { saveAttachment, getAttachment, deleteAttachment } from './attachments.js';

let currentCardId = null;
let drawerBackdrop = null;
let onStateRef = null;
let notifyRef = null;
let keydownListener = null;

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

const debounce = (fn, delay = 200) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export function openCardDetails(cardId, { onState, notify } = {}) {
  currentCardId = cardId;
  if (onState) onStateRef = onState;
  if (notify) notifyRef = notify;
  ensureDrawer();
  document.body.classList.add('drawer-open');
  if (!keydownListener) {
    keydownListener = (event) => {
      if (event.key === 'Escape') {
        closeCardDetails();
      }
    };
    document.addEventListener('keydown', keydownListener);
  }
}

export function syncCardDetails(state, { onState, notify } = {}) {
  if (onState) onStateRef = onState;
  if (notify) notifyRef = notify;
  if (!currentCardId || !drawerBackdrop) {
    return;
  }
  const board = getActiveBoard(state);
  const card = board?.cards.find((item) => item.id === currentCardId);
  if (!card) {
    closeCardDetails();
    return;
  }
  renderDrawer(card, board);
}

export function closeCardDetails() {
  currentCardId = null;
  if (drawerBackdrop) {
    drawerBackdrop.remove();
    drawerBackdrop = null;
  }
  document.body.classList.remove('drawer-open');
  if (keydownListener) {
    document.removeEventListener('keydown', keydownListener);
    keydownListener = null;
  }
}

function ensureDrawer() {
  if (drawerBackdrop) return;
  drawerBackdrop = document.createElement('div');
  drawerBackdrop.className = 'drawer-backdrop';
  drawerBackdrop.addEventListener('click', (event) => {
    if (event.target === drawerBackdrop) {
      closeCardDetails();
    }
  });
  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawerBackdrop.appendChild(drawer);
  document.body.appendChild(drawerBackdrop);
}

function renderDrawer(card, board) {
  if (!drawerBackdrop) return;
  const drawer = drawerBackdrop.querySelector('.drawer');
  if (!drawer) return;
  const column = board?.columns.find((col) => col.id === card.columnId);
  const labels = Array.isArray(card.labels) ? card.labels : [];
  const checklist = Array.isArray(card.checklist) ? card.checklist : [];
  const attachments = Array.isArray(card.attachments) ? card.attachments : [];
  drawer.setAttribute('aria-labelledby', 'cardDetailsTitle');
  drawer.innerHTML = `
    <header>
      <div>
        <h2 id="cardDetailsTitle">Card details</h2>
        <p class="drawer-subhead">${escapeHtml(column ? `Column: ${column.name}` : 'No column')}</p>
      </div>
      <button type="button" data-action="close">Close</button>
    </header>
    <section class="drawer-section">
      <h3>Title</h3>
      <input id="cardTitleInput" type="text" value="${escapeHtml(card.title ?? '')}" aria-labelledby="cardDetailsTitle" />
    </section>
    <section class="drawer-section">
      <h3>Description</h3>
      <textarea id="descriptionInput" placeholder="Write in Markdown">${escapeHtml(card.description ?? '')}</textarea>
      <div class="markdown-preview" id="descriptionPreview">${renderMarkdown(card.description ?? '')}</div>
    </section>
    <section class="drawer-section">
      <h3>Labels</h3>
      <div class="label-list">
        ${
          labels.length
            ? labels.map((label) => `<span class="label-pill">${escapeHtml(label)}</span>`).join('')
            : '<span class="label-pill muted">No labels yet</span>'
        }
      </div>
      <label for="labelInput">Comma separated</label>
      <input id="labelInput" type="text" value="${escapeHtml(labels.join(', '))}" />
    </section>
    <section class="drawer-section">
      <h3>Due date</h3>
      <input id="dueInput" type="date" value="${escapeHtml(toInputDate(card.dueDate))}" />
    </section>
    <section class="drawer-section">
      <h3>Checklist</h3>
      <div class="checklist">
        ${checklist
          .map(
            (item) => `
              <div class="checklist-item" data-id="${item.id}">
                <input type="checkbox" ${item.done ? 'checked' : ''} aria-label="Toggle checklist item" />
                <input type="text" value="${escapeHtml(item.text ?? '')}" aria-label="Checklist item text" />
                <button type="button" data-action="remove">Remove</button>
              </div>
            `
          )
          .join('')}
      </div>
      <button class="add-checklist" type="button">Add checklist item</button>
    </section>
    <section class="drawer-section">
      <h3>Attachments</h3>
      <div class="attachments">
        ${attachments
          .map(
            (file) => `
              <div class="attachment-card" data-id="${file.id}">
                <span>${escapeHtml(file.name)} (${formatSize(file.size)})</span>
                <div>
                  <button type="button" data-action="download">Download</button>
                  <button type="button" data-action="remove">Remove</button>
                </div>
              </div>
            `
          )
          .join('') || '<p class="empty">No attachments yet.</p>'}
      </div>
      <input id="attachmentInput" type="file" multiple />
    </section>
    <footer>
      <button id="deleteCard" type="button">Delete card</button>
    </footer>
  `;

  bindDrawerEvents(drawer, { checklist, attachments });
  const titleInput = drawer.querySelector('#cardTitleInput');
  titleInput?.focus();
}

function bindDrawerEvents(drawer, { checklist, attachments }) {
  const closeButton = drawer.querySelector('[data-action="close"]');
  closeButton?.addEventListener('click', () => {
    closeCardDetails();
  });

  const titleInput = drawer.querySelector('#cardTitleInput');
  if (titleInput) {
    const updateTitle = debounce((value) => {
      applyCardUpdate((card) => {
        card.title = value;
      });
    }, 150);
    titleInput.addEventListener('input', (event) => {
      updateTitle(event.target.value);
    });
  }

  const descriptionInput = drawer.querySelector('#descriptionInput');
  const descriptionPreview = drawer.querySelector('#descriptionPreview');
  if (descriptionInput) {
    const updateDescription = debounce((value) => {
      applyCardUpdate((card) => {
        card.description = value;
      });
    }, 250);
    descriptionInput.addEventListener('input', (event) => {
      const value = event.target.value;
      if (descriptionPreview) {
        descriptionPreview.innerHTML = renderMarkdown(value);
      }
      updateDescription(value);
    });
  }

  const labelInput = drawer.querySelector('#labelInput');
  labelInput?.addEventListener('change', (event) => {
    const value = event.target.value;
    const list = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    applyCardUpdate((card) => {
      card.labels = list;
    });
  });

  const dueInput = drawer.querySelector('#dueInput');
  dueInput?.addEventListener('change', (event) => {
    const value = event.target.value;
    applyCardUpdate((card) => {
      card.dueDate = value ? new Date(value).toISOString() : null;
    });
  });

  const checklistContainer = drawer.querySelector('.checklist');
  checklistContainer?.querySelectorAll('.checklist-item').forEach((itemEl) => {
    const id = itemEl.dataset.id;
    const checkbox = itemEl.querySelector('input[type="checkbox"]');
    const textInput = itemEl.querySelector('input[type="text"]');
    const removeButton = itemEl.querySelector('button[data-action="remove"]');
    checkbox?.addEventListener('change', (event) => {
      applyCardUpdate((card) => {
        ensureChecklist(card);
        const target = card.checklist.find((item) => item.id === id);
        if (target) {
          target.done = event.target.checked;
        }
      });
    });
    textInput?.addEventListener('input', (event) => {
      applyCardUpdate((card) => {
        ensureChecklist(card);
        const target = card.checklist.find((item) => item.id === id);
        if (target) {
          target.text = event.target.value;
        }
      });
    });
    removeButton?.addEventListener('click', () => {
      applyCardUpdate((card) => {
        ensureChecklist(card);
        card.checklist = card.checklist.filter((item) => item.id !== id);
      });
    });
  });

  const addChecklist = drawer.querySelector('.add-checklist');
  addChecklist?.addEventListener('click', () => {
    applyCardUpdate((card) => {
      ensureChecklist(card);
      card.checklist.push({ id: createId(), text: 'New item', done: false });
    });
  });

  const attachmentInput = drawer.querySelector('#attachmentInput');
  attachmentInput?.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    try {
      for (const file of files) {
        const meta = await saveAttachment(file);
        await applyCardUpdateAsync((card) => {
          ensureAttachments(card);
          card.attachments.push(meta);
        });
      }
      notifyRef?.('Attachment saved.', 'success');
    } catch (error) {
      console.error('Failed to save attachment', error);
      notifyRef?.('Failed to save attachment.', 'danger');
    } finally {
      event.target.value = '';
    }
  });

  const attachmentContainer = drawer.querySelector('.attachments');
  attachmentContainer?.querySelectorAll('.attachment-card').forEach((cardEl) => {
    const id = cardEl.dataset.id;
    const downloadButton = cardEl.querySelector('button[data-action="download"]');
    const removeButton = cardEl.querySelector('button[data-action="remove"]');
    downloadButton?.addEventListener('click', async () => {
      try {
        const record = await getAttachment(id);
        if (!record?.blob) {
          notifyRef?.('Attachment not found.', 'danger');
          return;
        }
        const url = URL.createObjectURL(record.blob);
        const anchor = Object.assign(document.createElement('a'), {
          href: url,
          download: record.name ?? 'attachment'
        });
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.error('Failed to download attachment', error);
        notifyRef?.('Download failed.', 'danger');
      }
    });
    removeButton?.addEventListener('click', async () => {
      try {
        await deleteAttachment(id);
        await applyCardUpdateAsync((card) => {
          ensureAttachments(card);
          card.attachments = card.attachments.filter((file) => file.id !== id);
        });
        notifyRef?.('Attachment removed.', 'success');
      } catch (error) {
        console.error('Failed to remove attachment', error);
        notifyRef?.('Failed to remove attachment.', 'danger');
      }
    });
  });

  const deleteButton = drawer.querySelector('#deleteCard');
  deleteButton?.addEventListener('click', async () => {
    if (!confirm('Delete this card?')) return;
    const attachmentIds = [...new Set(attachments.map((item) => item.id).filter(Boolean))];
    try {
      await applyStateAsync((current) => removeCard(current, currentCardId));
      await Promise.all(attachmentIds.map((id) => deleteAttachment(id).catch(() => {})));
      notifyRef?.('Card deleted.', 'danger');
      closeCardDetails();
    } catch (error) {
      console.error('Failed to delete card', error);
      notifyRef?.('Failed to delete card.', 'danger');
    }
  });
}

function applyCardUpdate(mutator) {
  if (!currentCardId || typeof onStateRef !== 'function') return;
  Promise.resolve(onStateRef((current) => updateCard(current, currentCardId, mutator))).catch((error) => {
    console.error('Failed to update card', error);
  });
}

async function applyCardUpdateAsync(mutator) {
  if (!currentCardId || typeof onStateRef !== 'function') return;
  await onStateRef((current) => updateCard(current, currentCardId, mutator));
}

async function applyStateAsync(updater) {
  if (typeof onStateRef !== 'function') return;
  await onStateRef(updater);
}

function ensureChecklist(card) {
  if (!Array.isArray(card.checklist)) {
    card.checklist = [];
  }
}

function ensureAttachments(card) {
  if (!Array.isArray(card.attachments)) {
    card.attachments = [];
  }
}

function renderMarkdown(text) {
  if (!text) {
    return '<p class="empty">No description yet.</p>';
  }
  const lines = escapeHtml(text).split('\n');
  let html = '';
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      html += `<ul>${listBuffer.join('')}</ul>`;
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      html += '<br />';
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html += `<h${level}>${formatInline(heading[2])}</h${level}>`;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(`<li>${formatInline(line.slice(2))}</li>`);
      continue;
    }

    flushList();
    html += `<p>${formatInline(line)}</p>`;
  }

  flushList();
  return html;
}

function formatInline(value) {
  return value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(\S[^_]*\S)_/g, '<em>$1</em>')
    .replace(/\*(\S[^*]*\S)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
