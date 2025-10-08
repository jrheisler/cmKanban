# KanbanX (Chrome Extension, MV3)

A local-first Kanban board that lives in Chrome's side panel. Built with pure HTML/CSS/JS.

## Load Unpacked
1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Pin the extension, press **Alt+K**, or open the Side Panel.

## Features (MVP)
- Side panel Kanban board (Backlog/Doing/Done)
- Drag-and-drop between columns
- Search (`/` to focus)
- Keyboard primer placeholder (`?` announces forthcoming help)
- Quick-add popup (optionally attach current tab URL)
- Context menu: right-click → **Add to KanbanX**
- Import/Export JSON (Options page)
- Dark mode defaults

## Data Model
Stored under `chrome.storage.local` key `kanban.v1`. Default board name is **My Board**. Board naming/multi-board: deferred.

### Attachments
File attachments are saved in an IndexedDB database named `kanbanx` using the `attachments` object store. Only attachment metadata is kept alongside cards in `chrome.storage.local`; the binary file blobs stay in IndexedDB for efficient retrieval and deletion.

## Keyboard
- `/` Focus search (side panel)
- `?` Reserve for help overlay (announces placeholder message)

## Permissions Rationale
- `storage` — Save your boards locally
- `contextMenus` — Right-click to add card
- `notifications` — Confirmations after context add
- `tabs` — Provide context for quick-add cards

## QA Checklist
- Install, open side panel
- Add column/card
- Drag card across columns
- Popup quick add
- Context menu add (with selection)
- Export/Import round trip
- Persist across browser restarts

## Roadmap (deferred)
- Board renaming & multi-board
- Card details drawer (markdown, labels, due date, checklist)
- WIP enforcement (prevent over-limit drops)
- IndexedDB attachment storage
- Sync settings via `chrome.storage.sync`

---
Packaged on 2025-10-07T12:32:36.903905Z
