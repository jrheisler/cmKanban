export const html = (strings, ...values) =>
  strings.map((segment, index) => segment + (values[index] ?? '')).join('');

export function escapeHtml(input = '') {
  return input.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])
  );
}

export function cardView(card) {
  const title = escapeHtml(card.title ?? 'Untitled');
  const labels = card.labels ?? [];
  const labelText = labels.length
    ? `🏷️ ${labels.map((label) => escapeHtml(label)).join(', ')}`
    : '';
  const dueDisplay = formatDate(card.dueDate);
  const dueText = dueDisplay ? `📅 ${escapeHtml(dueDisplay)}` : '';
  const checklist = Array.isArray(card.checklist) ? card.checklist : [];
  const completed = checklist.filter((item) => item?.done).length;
  const checklistText = checklist.length ? `☑️ ${completed}/${checklist.length}` : '';
  const metaParts = [labelText, dueText, checklistText].filter(Boolean);
  const ariaLabelParts = [card.title ?? 'Untitled'];
  if (labels.length) {
    ariaLabelParts.push(`Labels ${labels.join(', ')}`);
  }
  if (dueDisplay) {
    ariaLabelParts.push(`Due ${dueDisplay}`);
  }
  if (checklist.length) {
    ariaLabelParts.push(`Checklist ${completed} of ${checklist.length} complete`);
  }

  return html`<article
    class="card"
    draggable="true"
    data-id="${card.id}"
    role="listitem"
    tabindex="0"
    aria-label="${escapeHtml(ariaLabelParts.join('. '))}"
  >
    <div class="title">${title}</div>
    <div class="meta">${metaParts.map((item) => `<span>${item}</span>`).join('')}</div>
  </article>`;
}

function formatDate(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}
