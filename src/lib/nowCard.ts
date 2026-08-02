import { orderedListTasks } from './board'
import { agendaTasks, mobileListOrder } from './mobileSelectors'
import { parseTimeMinutes } from './timeFormat'
import type { AppState, Task } from './types'

/**
 * The one thing to do next, chosen for you.
 *
 * If something is time-blocked and close (or already late) the card commits to
 * it — a time and a single Done button, nothing to decide. Otherwise it offers
 * one untimed task, which you can re-roll.
 */

export type ShuffleSource = 'today' | 'all'

export function isShuffleSource(value: unknown): value is ShuffleSource {
  return value === 'today' || value === 'all'
}

export const NOW_LEAD_CHOICES = [15, 30] as const

/** How late a timed task can be and still hold the card. */
export const OVERDUE_WINDOW_MINUTES = 180

export type NowCard =
  | { kind: 'timed'; task: Task; minutesUntil: number }
  | { kind: 'suggestion'; task: Task }
  | null

type Options = {
  now: Date
  /** How far ahead a timed task counts as "soon". */
  leadMinutes: number
  shuffleSource: ShuffleSource
  /** Bumped by the shuffle button; picks a different untimed task each press. */
  shuffleIndex?: number
}

/** Timed, undone tasks planned into Today, earliest first. */
function timedToday(state: AppState): Array<{ task: Task; minutes: number }> {
  return agendaTasks(state, 'today')
    .filter((task) => !task.completed)
    .flatMap((task) => {
      const minutes = parseTimeMinutes(task.time)
      return minutes === null ? [] : [{ task, minutes }]
    })
    .sort((a, b) => a.minutes - b.minutes)
}

/** Untimed, undone candidates the shuffle can offer. */
export function shuffleCandidates(
  state: AppState,
  source: ShuffleSource,
): Task[] {
  if (source === 'today') {
    return agendaTasks(state, 'today').filter(
      (task) => !task.completed && !task.time,
    )
  }

  const seen = new Set<string>()
  const out: Task[] = []
  for (const listId of mobileListOrder(state)) {
    for (const taskId of orderedListTasks(state, listId)) {
      const task = state.tasks[taskId]
      if (!task || seen.has(task.id)) continue
      seen.add(task.id)
      if (task.completed || task.time) continue
      out.push(task)
    }
  }
  return out
}

export function nowCard(state: AppState, opts: Options): NowCard {
  const { now, leadMinutes, shuffleSource, shuffleIndex = 0 } = opts
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (const { task, minutes } of timedToday(state)) {
    const until = minutes - nowMinutes
    if (until > leadMinutes) break
    if (until < -OVERDUE_WINDOW_MINUTES) continue
    return { kind: 'timed', task, minutesUntil: until }
  }

  const candidates = shuffleCandidates(state, shuffleSource)
  if (candidates.length === 0) return null
  const index = ((shuffleIndex % candidates.length) + candidates.length) %
    candidates.length
  return { kind: 'suggestion', task: candidates[index] }
}

/** "Now", "in 12 min", "20 min late" — the card's one line of context. */
export function formatMinutesUntil(minutesUntil: number): string {
  if (minutesUntil <= -1) return `${Math.abs(minutesUntil)} min late`
  if (minutesUntil <= 1) return 'Now'
  return `in ${minutesUntil} min`
}
