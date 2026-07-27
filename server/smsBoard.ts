import { classifyTask } from '../src/lib/classifier.js'
import { splitCaptureText } from '../src/lib/parseCapture.js'
import { smsTaskId } from '../src/lib/smsTaskIds.js'
import { routeTimingWords } from '../src/lib/timing.js'
import {
  createEmptyState,
  type AppState,
  type PlaylistId,
  type Task,
} from '../src/lib/types.js'
import { isSidIngested, markSidsIngested } from './ingestedSids.js'
import {
  isKvConfigured,
  readCloudState,
  writeCloudState,
} from './stateStore.js'

export type SmsBoardIngestResult = {
  /** Whether KV was available and a write was attempted or skipped as duplicate. */
  ok: boolean
  /** Task ids created (or already present) for this MessageSid. */
  taskIds: string[]
  /** True when this SID was already on the board / marked ingested. */
  alreadyIngested: boolean
  saved: boolean
}

/**
 * Write inbound SMS to-dos into the shared KV board state using the same
 * capture pipeline as the client (split → classify → timing words).
 * Marks the Twilio MessageSid so /api/inbox will not re-add it.
 */
export async function ingestSmsIntoCloudState(
  raw: string,
  messageSid: string,
  env: NodeJS.ProcessEnv = process.env,
  deps: {
    read?: typeof readCloudState
    write?: typeof writeCloudState
    isIngested?: typeof isSidIngested
    markIngested?: typeof markSidsIngested
    now?: number
  } = {},
): Promise<SmsBoardIngestResult> {
  const sid = messageSid.trim()
  if (!sid || !raw.trim()) {
    return { ok: false, taskIds: [], alreadyIngested: false, saved: false }
  }
  if (!isKvConfigured(env)) {
    return { ok: false, taskIds: [], alreadyIngested: false, saved: false }
  }

  const read = deps.read ?? readCloudState
  const write = deps.write ?? writeCloudState
  const isIngested = deps.isIngested ?? isSidIngested
  const markIngested = deps.markIngested ?? markSidsIngested
  const now = deps.now ?? Date.now()

  if (await isIngested(sid, env)) {
    const remote = await read(env)
    const state = coerceBoardState(remote)
    return {
      ok: true,
      taskIds: collectSmsTaskIds(state, sid),
      alreadyIngested: true,
      saved: false,
    }
  }

  const base = coerceBoardState(await read(env))

  if (stateHasSmsMessage(base, sid)) {
    await markIngested([sid], env)
    return {
      ok: true,
      taskIds: collectSmsTaskIds(base, sid),
      alreadyIngested: true,
      saved: false,
    }
  }

  const first = applySmsCapture(base, raw, sid, now)
  if (first.createdIds.length === 0) {
    await markIngested([sid], env)
    return { ok: true, taskIds: [], alreadyIngested: true, saved: false }
  }

  // Soft CAS: re-apply onto the freshest snapshot so concurrent SMS ingest
  // does not drop tasks written between our first read and write.
  const latest = coerceBoardState(await read(env))
  if (stateHasSmsMessage(latest, sid)) {
    await markIngested([sid], env)
    return {
      ok: true,
      taskIds: collectSmsTaskIds(latest, sid),
      alreadyIngested: true,
      saved: false,
    }
  }
  const final = applySmsCapture(latest, raw, sid, now)
  const saved = await write(final.state, env)
  await markIngested([sid], env)

  return {
    ok: true,
    taskIds: final.createdIds,
    alreadyIngested: false,
    saved,
  }
}

/** Server-side mirror of the client capture pipeline (split/classify/timing). */
function applySmsCapture(
  prev: AppState,
  raw: string,
  messageSid: string,
  now: number,
): { state: AppState; createdIds: string[] } {
  const pieces = splitCaptureText(raw)
  if (pieces.length === 0) return { state: prev, createdIds: [] }

  const tasks = { ...prev.tasks }
  let listOrders = { ...prev.listOrders }
  const playlists: Record<PlaylistId, string[]> = {
    today: [...prev.playlists.today],
    tomorrow: [...prev.playlists.tomorrow],
    week: [...prev.playlists.week],
  }
  const createdIds: string[] = []

  pieces.forEach((text, index) => {
    const { listId: preferred } = classifyTask(text)
    const listId = resolveActiveListId(prev, preferred)
    const { playlistId } = routeTimingWords(text)
    const id = smsTaskId(messageSid, index)
    if (tasks[id]) return
    const task: Task = {
      id,
      text,
      listId,
      completed: false,
      completedAt: null,
      createdAt: now,
      time: null,
      overdue: false,
      isNew: true,
    }
    tasks[id] = task
    createdIds.push(id)
    const order = listOrders[listId] ?? []
    if (!order.includes(id)) {
      listOrders = { ...listOrders, [listId]: [...order, id] }
    }
    if (playlistId && !playlists[playlistId].includes(id)) {
      playlists[playlistId] = [...playlists[playlistId], id]
    }
  })

  if (createdIds.length === 0) return { state: prev, createdIds: [] }

  return {
    state: {
      ...prev,
      tasks,
      playlists,
      listOrders,
      seeded: true,
    },
    createdIds,
  }
}

function resolveActiveListId(state: AppState, preferred: string): string {
  if (state.lists.some((l) => l.id === preferred)) return preferred
  if (state.lists.some((l) => l.id === 'random')) return 'random'
  return state.lists[0]?.id ?? preferred
}

function stateHasSmsMessage(state: AppState, messageSid: string): boolean {
  return Boolean(state.tasks[smsTaskId(messageSid, 0)])
}

function collectSmsTaskIds(state: AppState, messageSid: string): string[] {
  const ids: string[] = []
  for (let i = 0; i < 64; i++) {
    const id = smsTaskId(messageSid, i)
    if (!state.tasks[id]) break
    ids.push(id)
  }
  return ids
}

function coerceBoardState(value: AppState | null): AppState {
  if (!value || typeof value !== 'object') return createEmptyState()
  if (!Array.isArray(value.lists) || value.lists.length === 0) {
    return { ...createEmptyState(), ...value, lists: createEmptyState().lists }
  }
  return {
    ...createEmptyState(),
    ...value,
    playlists: {
      today: value.playlists?.today ?? [],
      tomorrow: value.playlists?.tomorrow ?? [],
      week: value.playlists?.week ?? [],
    },
    tasks: value.tasks ?? {},
    listOrders: value.listOrders ?? {},
    seeded: true,
  }
}
