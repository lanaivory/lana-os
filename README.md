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
- Multi-column masonry board of list cards
- Capture bar pinned to the bottom (messaging-app style)

## Model

- **Context lists** own each task once
- **Playlists** (Today, Tomorrow, This Week) store ordered task ids only
- Editing, completing, or deleting a task updates it everywhere
- Persists in `localStorage` under `lana-os:v1`

## Core logic

| Module | Role |
| --- | --- |
| `src/lib/classifier.ts` | Keyword + URL rules → context list |
| `src/lib/timing.ts` | Timing words → playlist |
| `src/lib/rollover.ts` | Morning: Tomorrow → Today, mark overdue |
| `src/lib/completion.ts` | Complete + auto-clear after 1 hour |

## Text capture (Twilio)

Text a thought to your Twilio number and Lana OS imports it through the same capture pipeline (split → classify → timing-route → board). No database and no webhook — the app polls a Vercel serverless function.

Set these environment variables (from the [Twilio Console](https://console.twilio.com/)):

| Variable | Description |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Account SID |
| `TWILIO_AUTH_TOKEN` | Auth Token |
| `TWILIO_NUMBER` | Your Twilio phone number (E.164, e.g. `+15551234567`) |

For local dev, put them in a `.env` file at the project root (never commit secrets). On Vercel, add the same names in Project → Settings → Environment Variables.

- `GET /api/inbox` lists recent inbound SMS (`sid`, `body`, `dateSent`). If any of the three variables are missing, it returns an empty list.
- The client polls every 2 minutes (plus a header **Check now** button for an immediate pull), runs new message bodies through capture, and stores consumed `sid`s in `localStorage` so nothing is imported twice.
- When the endpoint responds OK, the header shows a subtle **Text capture connected** indicator.
