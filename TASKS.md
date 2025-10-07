#Perfect—here’s a clear, hand-off task list for Codex to build the MVP.

# Milestone 1 — MV3 Extension Skeleton

1. Create repo + scaffold

* Init repo with folders:

  ```
  /icons
  /background
  /sidepanel
  /popup
  /options
  /content
  /assets
  manifest.json
  ```
* Add placeholder icons (16/48/128).

2. Manifest (MV3)

* Add `manifest.json`:

  * `manifest_version: 3`
  * `name: "KanbanX"`
  * `version: "0.1.0"`
  * `side_panel.default_path: "sidepanel/index.html"`
  * `action.default_popup: "popup/popup.html"`
  * `background.service_worker: "background/service-worker.js" (type: module)`
  * `permissions: ["storage","contextMenus","notifications"]`
  * `commands.open_side_panel` with `Alt+K`
  * `options_page: "options/options.html"`
  * Minimal `content_scripts` (stub).

**Acceptance:** Extension loads via `chrome://extensions` → Load unpacked without errors.

---

# Milestone 2 — Data Layer (Local-First)

3. Storage adapter

* File: `sidepanel/state.js`
* Implement:

  * `KEY = "kanban.v1"`
  * `loadState()`: read from `chrome.storage.local`
  * `saveState(state)`: write to `chrome.storage.local`
  * `initDefault()`: if empty, seed a board with:

    ```
    {
      version:1,
      boards:[{
        id:"default",
        name:"My Board",       // default board name; naming UX later
        labels:[],
        columns:[
          {id:"c1", name:"Backlog", wip:null, order:0},
          {id:"c2", name:"Doing",   wip:2,    order:1},
          {id:"c3", name:"Done",    wip:null, order:2}
        ],
        cards:[]
      }],
      activeBoardId:"default",
      settings:{ theme:"dark", compact:false },
      ui:{ query:"" }
    }
    ```
* Export helpers to update board/cards immutably.

**Acceptance:** Calling `initDefault()` then `loadState()` returns seeded structure.

---

# Milestone 3 — Side Panel Kanban UI

4. HTML/CSS shell

* `sidepanel/index.html` with fixed header:

  * Title, search input `#search`, button `#addColumn`
  * `<main id="board">` grid container
* `sidepanel/styles.css`:

  * Dark theme, grid columns (auto width ~280px), card styles, drag-over outline.

5. Render + DnD

* `sidepanel/templates.js`: tiny `html()` + `escapeHtml()` + `cardView(card)`.
* `sidepanel/board.js`:

  * `renderBoard(state,{onState})`:

    * Render columns sorted by `order`.
    * Render cards filtered by search (`state.ui.query`).
    * Wire **drag and drop**:

      * `.card` is draggable; `.card-list` is dropzone.
      * On drop: update `card.columnId`, bump `updatedAt`.
    * `+ Add card` button per column.
* `sidepanel/app.js`:

  * Boot: `state = await loadState() || await initDefault()`
  * Wire search input to re-render
  * `+ Column` creates `{id, name:"New", wip:null, order:len}` and saves.
  * Expose `onState(next)` that saves + re-renders.

**Acceptance:** Side panel opens to a Kanban board; can add/move cards between columns; search filters.

---

# Milestone 4 — Quick Add (Popup) + Context Menu

6. Popup quick capture

* `popup/popup.html`: input `#title`, checkbox `#attach`, Save.
* `popup/popup.js`:

  * On save:

    * Get active tab URL (if `attach`).
    * Push new card to first column.
    * Save and `window.close()`.

7. Context menu add

* `background/service-worker.js`:

  * On install, create context menu “Add to Kanban” for `selection` & `page`.
  * On click: add a card with selection text or page title; notify.

**Acceptance:** Right-click anywhere → Add to Kanban creates a card; popup does the same.

---

# Milestone 5 — Options (Import/Export + Theme)

8. Options page

* `options/options.html`: Export button, file input for Import, theme select.
* `options/options.js`:

  * Export downloads `kanban-export.json`.
  * Import reads JSON and writes to `chrome.storage.local`.
  * Theme selection saves to `state.settings.theme`.

**Acceptance:** Export/Import round-trip works; theme value persists (UI can read later).

---

# Milestone 6 — Quality & UX Polish

9. Keyboard shortcuts

* `sidepanel/keyboard.js`: `/` focuses search; `?` reserved for help overlay later.

10. WIP display (non-blocking)

* Show `currentCount / wip` in column header; no enforcement yet.

11. Accessibility

* Add ARIA roles/labels for columns and cards; `aria-live="polite"` on board.

**Acceptance:** No console errors; basic a11y checks pass (role landmarks present).

---

# Milestone 7 — Packaging & Docs

12. Icons & branding

* Export square dark icon set (16/48/128). Name: `icons/icon{size}.png`.

13. README

* Instructions:

  * Load unpacked
  * Keyboard shortcuts
  * Permissions rationale
  * Data stays local; how to export/import

14. QA checklist

* Install, open side panel
* Add column/card
* Drag card across columns
* Popup add
* Context menu add (with selection)
* Export/Import
* Persist across browser restarts

---

## Deferred (explicitly later)

* Board renaming & multi-board management (keep using default `"My Board"` now).
* Card details drawer (markdown, labels, due date, checklist).
* WIP enforcement on drop.
* IndexedDB attachment store.
* Sync settings via `chrome.storage.sync`.

---

## Deliverables

* Working extension folder tree
* Zip artifact for load-unpacked
* README with steps
* Icon assets


