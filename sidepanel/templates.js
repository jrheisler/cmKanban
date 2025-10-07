export const html = (s, ...v) => s.map((x,i)=> x + (v[i]??'')).join('')

export function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
}

export function cardView(card){
  return html`<article class="card" draggable="true" data-id="${card.id}">
    <div class="title">${escapeHtml(card.title||'Untitled')}</div>
    <div class="meta">${card.labels?.length ? '🏷️ '+card.labels.join(', ') : ''}</div>
  </article>`
}
