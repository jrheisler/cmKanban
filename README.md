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
- Quick-add popup (optionally attach current tab URL)
- Context menu: right-click → **Add to KanbanX**
- Import/Export JSON (Options page)
- Dark mode defaults

## Data Model
Stored under `chrome.storage.local` key `kanban.v1`. Default board name is **My Board**. Board naming/multi-board: deferred.

## Keyboard
- `/` Focus search (side panel)

## Permissions Rationale
- `storage` — Save your boards locally
- `contextMenus` — Right-click to add card
- `notifications` — Confirmations after context add

## Roadmap (deferred)
- Board renaming & multi-board
- Card details drawer (markdown, labels, due date, checklist)
- WIP enforcement (prevent over-limit drops)
- IndexedDB attachment storage
- Sync settings via `chrome.storage.sync`

---
Packaged on 2025-10-07T12:32:36.903905Z
