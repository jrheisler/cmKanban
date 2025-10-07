import {
  loadState,
  saveState,
  initDefault,
  getActiveBoard,
  addColumn,
  withState
} from './state.js';
import { renderBoard } from './board.js';
import './keyboard.js';

const elSearch = document.getElementById('search');
const elAddColumn = document.getElementById('addColumn');

let state = await loadState();
if (!state) {
  state = await initDefault();
}

render();

elSearch.addEventListener('input', (event) => {
  state = withState(state, (draft) => {
    draft.ui = { ...(draft.ui ?? {}), query: event.target.value };
  });
  render();
});

elAddColumn.addEventListener('click', () => {
  const board = getActiveBoard(state);
  const nextColumn = {
    id: crypto.randomUUID(),
    name: 'New',
    wip: null,
    order: board ? board.columns.length : 0
  };
  onState((current) => addColumn(current, nextColumn));
});

function render() {
  renderBoard(state, { onState });
}

async function onState(updater) {
  state = typeof updater === 'function' ? updater(state) : updater;
  await saveState(state);
  render();
}
