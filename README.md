# Lana OS

A local-first personal operating system for planning your day. Capture thoughts, auto-sort them into context lists, and plan Today / Tomorrow / This Week as playlists of references — never copies.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

```bash
npm test
npm run build
```

## Layout

- Top header: title, Find (`⌘K`), Undo, Clear Completed, + New List, theme toggle, settings
- Capture bar under the header
- Horizontally scrolling multi-column board
  - Left: Today (live clock + sort-by-time) with Tomorrow and This Week stacked beneath
  - Right: context list cards (Inbox, Personal, Content, Follow-up, Errands, Reading, plus any you create)

## Model

- **Context lists** own each task once
- **Playlists** (Today, Tomorrow, This Week) store ordered task ids only
- Editing, completing, or deleting a task updates it everywhere
- Persists in `localStorage` under `lana-os:v1`

## Core logic (unchanged modules)

| Module | Role |
| --- | --- |
| `src/lib/classifier.ts` | Keyword + URL rules → context list |
| `src/lib/timing.ts` | Timing words → playlist |
| `src/lib/rollover.ts` | Morning: Tomorrow → Today, mark overdue |
| `src/lib/completion.ts` | Complete + auto-clear after 1 hour |
