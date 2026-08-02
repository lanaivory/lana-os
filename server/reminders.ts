import {
  dueReminders,
  reminderMessage,
} from '../src/lib/commitments.js'
import { formatPlanTime } from '../src/lib/timeFormat.js'
import type { AppState, Commitment } from '../src/lib/types.js'
import { isKvConfigured, readCloudState, writeCloudState } from './stateStore.js'
import { sendPushToAll } from './webPush.js'

export type ReminderRunResult = {
  /** Reminders that were pushed on this run. */
  sent: number
  /** Reminders considered due before sending. */
  due: number
  saved: boolean
}

/** Local date key on the server, only used to phrase "today"/"tomorrow". */
function todayKeyFor(nowMs: number): string {
  const date = new Date(nowMs)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function markSent(
  state: AppState,
  fired: Commitment[],
  nowMs: number,
): AppState {
  const ids = new Set(fired.map((commitment) => commitment.id))
  return {
    ...state,
    commitments: (state.commitments ?? []).map((commitment) =>
      ids.has(commitment.id)
        ? { ...commitment, reminderSentAt: nowMs }
        : commitment,
    ),
  }
}

/**
 * Send any commitment reminders that have come due, then mark them sent.
 *
 * Each reminder carries an absolute `reminderAt` resolved on the device that
 * created it, so this never has to reason about the user's timezone. Marking
 * before returning is what makes the run idempotent: cron and the app can both
 * call it without doubling up.
 */
export async function runDueReminders(
  env: NodeJS.ProcessEnv = process.env,
  deps: {
    read?: typeof readCloudState
    write?: typeof writeCloudState
    send?: typeof sendPushToAll
    now?: number
  } = {},
): Promise<ReminderRunResult> {
  if (!isKvConfigured(env)) return { sent: 0, due: 0, saved: false }

  const read = deps.read ?? readCloudState
  const write = deps.write ?? writeCloudState
  const send = deps.send ?? sendPushToAll
  const now = deps.now ?? Date.now()

  const state = await read(env)
  if (!state) return { sent: 0, due: 0, saved: false }

  const due = dueReminders(state, now)
  if (due.length === 0) return { sent: 0, due: 0, saved: false }

  const todayKey = todayKeyFor(now)
  let sent = 0
  for (const commitment of due) {
    try {
      await send(
        reminderMessage(commitment, todayKey, formatPlanTime),
        env,
        {},
        { url: '/' },
      )
      sent += 1
    } catch {
      // A failed push should not block the rest, nor retry forever.
    }
  }

  const saved = await write(markSent(state, due, now), env)
  return { sent, due: due.length, saved }
}
