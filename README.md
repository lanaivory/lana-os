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
- Settings: Enable notifications, Check now (text capture), wrap titles
- Multi-column masonry board of list cards
- Capture bar pinned to the bottom (messaging-app style)

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
- After `/api/sms` classifies the text, it fans out a web push via `buildPushConfirmation`: title **Added to \<List\>** (e.g. `Added to Appointments`) with the task title as the body. Several to-dos use title **Added to your lists** and bullet lines `title → List`. Dead endpoints (`404` / `410`) are pruned.
- SMS still replies with TwiML from `buildSmsConfirmation` (e.g. `Got it ✅ dentist → Appointments`).
- In **Settings → Notifications**, tap **Enable notifications** (user gesture required on iOS). On iPhone, install to the Home Screen first, then open from the icon before enabling. Opening the app re-syncs an existing subscription to KV.

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
| `src/lib/classifier.ts` | Keyword + URL rules → context list |
| `src/lib/timing.ts` | Timing words → playlist |
| `src/lib/rollover.ts` | Morning: Tomorrow → Today, mark overdue |
| `src/lib/completion.ts` | Complete + auto-clear after 1 hour |

## Text capture (Twilio)

Text a thought to your Twilio number and Lana OS imports it through the same capture pipeline (split → classify → timing-route → board). No database — the app polls a Vercel serverless function for new messages, and an optional inbound webhook can reply with a smart confirmation.

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
- `POST /api/sms` is the Twilio inbound webhook. It runs the message through the same splitter + classifier and replies with TwiML confirming each to-do and its list. It does **not** store board tasks — the board still fills via `/api/inbox` polling — but it does send a web push (when configured) using the same confirmation text. In Twilio, set the number’s **A message comes in** webhook to `https://<your-deployment>/api/sms` using **HTTP POST**.
