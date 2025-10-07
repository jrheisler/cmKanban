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
  const ariaLabelParts = [card.title ?? 'Untitled'];
  if (labelText) {
    ariaLabelParts.push(`Labels ${labels.join(', ')}`);
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
    <div class="meta">${labelText}</div>
  </article>`;
}
