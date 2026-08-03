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

Both views share one store, one capture pipeline, and one cloud state. `src/App.tsx` picks between them at 768px.

**Desktop** (`src/desktop/`)

- Top header: title, Find (`⌘K`), Undo, Clear Completed, + New List, theme toggle, settings
- Multi-column masonry board of list cards, drag-and-drop planning
- Capture bar pinned to the bottom (messaging-app style)

**Mobile** (`src/mobile/`, ≤768px including the installed PWA)

Four tabs over the same store, built around showing less and deciding more for you.

- **Playlist** — Today / Tomorrow / This Week, one day at a time, tap or swipe to change. A Now card sits on top: when a task is timed and close it takes the card with one full-width Done, otherwise it suggests a single untimed task you can re-roll. Completed work folds away behind an inline `Completed · Clear`, and completing or deleting raises a brief Undo toast.
- **Lists** — every context list, pinned ones in their own section (pin icon, long-press, or swipe right). When capture cannot place something, a triage banner offers the raw text, a few lists, and "Also add to Today".
- **Calendar** — an agenda of dated commitments with a Week / Upcoming toggle. No hour timeline: a task's time lives on its row.
- **Settings** — the capture number, what to do when the classifier is unsure, accent, Now-card lead time and shuffle source, and the optional Google Calendar connect.

Rows are the same everywhere: checkbox, boxed monospace time on the left when there is one, title, then the owning list named plainly — and only when it differs from the surface you are on.

One text field sits on the bottom edge, never two. On the Playlist and the Lists index it runs the capture pipeline; inside a list it adds straight to that list and keeps focus, so several go in a row.

Tapping a task opens one lean sheet: title, the classifier's top few lists as chips (with a searchable `More…` behind them), a Today / Tomorrow / This week segment that clears on a second tap, an optional time, and a quiet delete. Every control writes through, so closing is saving. Nothing in it grabs the keyboard on open.

View state (day, sort, accent, lead time, onboarding) is per device in `lana-os:mobile:v1`, so a phone never fights the desktop board over synced state.

## Commitments and reminders

A **commitment** is the dated half of the app: a title, a date, an optional time, and an optional reminder. It pulls itself into This week as the date nears and into Today on the day, so nothing has to be planned by hand.

Reminders arrive as **web push**, never as a text — the number is for capture in, not nagging out. Each commitment stores an absolute `reminderAt` resolved on the device that created it, so the server only compares numbers and never has to guess a timezone.

- `GET|POST /api/reminders` sends everything due and marks it sent, which makes it safe to call repeatedly.
- Vercel's Hobby plan only allows a daily cron, so `vercel.json` schedules one run at 07:00 as a backstop and the app sweeps the endpoint whenever it is open or returns to the foreground. On a plan with finer crons, tighten the schedule for reminders that land on time while the app is closed.
- A reminder more than six hours stale is skipped rather than fired.

## Google Calendar (optional)

Entirely skippable, and read-only. Paste the **secret address in iCal format** from Google Calendar settings into Settings → Google Calendar; `GET /api/gcal` fetches it server-side (browsers cannot read a cross-origin `.ics`) and its events appear greyed in the agenda. Nothing is ever written back.

## Model

- **Context lists** own each task once
- **Playlists** (Today, Tomorrow, This Week) store ordered task ids only
- Editing, completing, or deleting a task updates it everywhere
- Local cache in `localStorage` under `lana-os:v1`; cloud source of truth via `GET`/`POST /api/state` when Vercel KV is configured

## Installable app (PWA)

Lana OS ships with a web app manifest + service worker so you can **Add to Home Screen** on a phone and open it full-screen like a native app (`standalone`, dark theme `#0b0d11`).

## Web push (text capture alerts)

When Twilio’s `/api/sms` webhook captures a to-do, Lana OS can send a phone notification via the Web Push API (works on an **iOS home-screen PWA** and desktop browsers that support push).

| Variable | Description |
| --- | --- |
| `VAPID_PUBLIC_KEY` | VAPID public key (safe to expose to the client) |
| `VAPID_PRIVATE_KEY` | VAPID private key (server only) |
| `VAPID_SUBJECT` | Contact URI, e.g. `mailto:you@example.com` |

Generate a key pair with `npx web-push generate-vapid-keys`, then add the three vars locally and in Vercel.

- `GET /api/push-public-key` returns `{ publicKey }` for `PushManager.subscribe`.
- `POST /api/push-subscribe` / `POST /api/push-unsubscribe` store or remove a browser `PushSubscription` in the Vercel KV set `lana-os-push-subs`. Both use the same `x-app-pass` gate as `/api/state`.
- After `/api/sms` builds the confirmation (`buildSmsConfirmation`), it writes the to-dos into shared KV (when configured), then fans out a notification titled **Lana OS** with that same body (e.g. `Got it ✅ dentist → Appointments`). Dead endpoints (`404` / `410`) are pruned.
- In the header, tap **Enable notifications** (user gesture required on iOS). On iPhone, install to the Home Screen first, then open from the icon before enabling.

## Cloud sync + passcode

Across devices, the board syncs through Vercel KV:

| Variable | Description |
| --- | --- |
| `KV_REST_API_URL` | Vercel KV REST URL |
| `KV_REST_API_TOKEN` | Vercel KV REST token |
| `KV_URL` | Optional Redis URL (also provided by Vercel KV) |
| `APP_PASSCODE` | Shared passcode; required as `x-app-pass` on `/api/state` |

**Create a store:** In the [Vercel dashboard](https://vercel.com/dashboard) open your project → **Storage** → **Create** → **KV** (or link an existing Upstash Redis / KV integration). Connect it to the project so the `KV_*` env vars appear, then redeploy. For local dev, run `vercel env pull` or paste the same values into `.env`.

- `GET /api/state` returns the saved board JSON (or `null` if empty / KV unset).
- `POST /api/state` saves the full board under the key `lana-os-state`.
- If KV isn’t configured, the API no-ops and the client keeps using `localStorage` — nothing breaks.
- On first load the app prompts for a passcode, stores it in `localStorage`, and sends it as the `x-app-pass` header on `/api/state` calls. When `APP_PASSCODE` is set, mismatched headers get `401`.
- The client debounces saves on every change and polls `GET /api/state` about every 12 seconds so edits from another device show up.

## Core logic

| Module | Role |
| --- | --- |
| `src/lib/classifier.ts` | Keyword + URL rules → context list, and the ranked list behind the chips |
| `src/lib/listSuggest.ts` | The two or three lists a capture sheet offers |
| `src/lib/triage.ts` | Captures the classifier could not place |
| `src/lib/timing.ts` | Timing words → playlist |
| `src/lib/commitments.ts` | Dated commitments, their placement, and due reminders |
| `src/lib/nowCard.ts` | What to do next: timed and close, or one untimed suggestion |
| `src/lib/ics.ts` | Read-only calendar feed parsing |
| `src/lib/rollover.ts` | Morning: Tomorrow → Today, mark overdue |
| `src/lib/completion.ts` | Complete + auto-clear after 1 hour |

## Text capture (Twilio)

Text a thought to your Twilio number and Lana OS imports it through the same capture pipeline (split → classify → timing-route → board).

Set these environment variables (from the [Twilio Console](https://console.twilio.com/)):

| Variable | Description |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Account SID |
| `TWILIO_AUTH_TOKEN` | Auth Token |
| `TWILIO_NUMBER` | Your Twilio phone number (E.164, e.g. `+15551234567`) |

For local dev, put them in a `.env` file at the project root (never commit secrets). On Vercel, add the same names in Project → Settings → Environment Variables.

- `POST /api/sms` is the Twilio inbound webhook. It runs the message through the same splitter + classifier + timing router, **writes the to-do(s) into the shared KV board** (`lana-os-state`) with deterministic ids (`sms_<MessageSid>_<index>`), marks the MessageSid in `lana-os-ingested-sids`, replies with TwiML confirming each to-do and its list, then sends a web push deep-linked to `/?focus=<taskId>`. In Twilio, set the number’s **A message comes in** webhook to `https://<your-deployment>/api/sms` using **HTTP POST**.
- `GET /api/capture-number` returns `{ number }` from `TWILIO_NUMBER` so the app can show — and offer to save — the number you text. It is printed on the app, not a secret.
- `GET /api/inbox` lists recent inbound SMS (`sid`, `body`, `dateSent`) that have **not** already been ingested by `/api/sms`. If any of the three Twilio variables are missing, it returns an empty list.
- The client still polls every 2 minutes (plus a header **Check now** button) as a fallback when the webhook/KV path is unavailable. Consumed `sid`s are stored in `localStorage`, and messages already present on the board (by SMS task id) are skipped — a texted to-do is added exactly once.
- Tapping a push notification opens `/?focus=<taskId>`, which immediately refreshes cloud state (retrying for a few seconds) then scrolls to and highlights the task.
- When the inbox endpoint responds OK, the header shows a subtle **Text capture connected** indicator.
