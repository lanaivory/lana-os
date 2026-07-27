import { classifyTask } from '../src/lib/classifier.js'
import { splitCaptureText } from '../src/lib/parseCapture.js'
import { smsTaskId } from '../src/lib/smsTaskIds.js'
import { DEFAULT_LISTS } from '../src/lib/types.js'

const TITLE_MAX = 48

/** Map a classifier list id to the board list display name. */
export function listDisplayName(listId: string): string {
  return DEFAULT_LISTS.find((l) => l.id === listId)?.name ?? 'Random'
}

/** Truncate a task title for a concise SMS line. */
export function shortTitle(text: string, max = TITLE_MAX): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

export type ClassifiedTodo = {
  title: string
  /** Full capture piece (pre-truncation) for client id alignment. */
  text: string
  listId: string
  listName: string
  /** Present when MessageSid is known — matches client inbox capture ids. */
  taskId?: string
}

/**
 * Split + classify using the same pipeline as capture (no timing / no storage).
 * When `messageSid` is provided, attaches deterministic task ids for push deep-links.
 */
export function classifyInboundTodos(
  raw: string,
  messageSid?: string,
): ClassifiedTodo[] {
  return splitCaptureText(raw).map((text, index) => {
    const { listId } = classifyTask(text)
    const sid = messageSid?.trim()
    return {
      title: shortTitle(text),
      text,
      listId,
      listName: listDisplayName(listId),
      ...(sid ? { taskId: smsTaskId(sid, index) } : {}),
    }
  })
}

/**
 * Human-readable confirmation body for the TwiML <Message>.
 * One to-do → single line; several → header + bullets.
 */
export function buildSmsConfirmation(raw: string): string {
  const todos = classifyInboundTodos(raw)
  if (todos.length === 0) {
    return 'Got it ✅'
  }
  if (todos.length === 1) {
    const t = todos[0]
    return `Got it ✅ ${t.title} → ${t.listName}`
  }
  const lines = todos.map((t) => `• ${t.title} → ${t.listName}`)
  return ['Got it ✅', ...lines].join('\n')
}

/** Lock-screen / tray payload so the destination list is the primary signal. */
export type PushConfirmation = {
  title: string
  body: string
  taskId?: string
  listId?: string
  url: string
}

/**
 * Web-push copy for an inbound SMS capture.
 * Single to-do → title "Added to <List>", body = task title.
 * Several → title "Added to your lists", body = bullets with list names.
 * Returns null when there is nothing to notify about.
 */
export function buildPushConfirmation(
  raw: string,
  messageSid?: string,
): PushConfirmation | null {
  const todos = classifyInboundTodos(raw, messageSid)
  if (todos.length === 0) return null

  const first = todos[0]
  const url = first.taskId
    ? `/?focus=${encodeURIComponent(first.taskId)}`
    : '/'

  if (todos.length === 1) {
    return {
      title: `Added to ${first.listName}`,
      body: first.title,
      ...(first.taskId ? { taskId: first.taskId } : {}),
      listId: first.listId,
      url,
    }
  }

  return {
    title: 'Added to your lists',
    body: todos.map((t) => `• ${t.title} → ${t.listName}`).join('\n'),
    ...(first.taskId ? { taskId: first.taskId } : {}),
    listId: first.listId,
    url,
  }
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Valid TwiML Response with a single Message. */
export function buildTwimlMessage(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response><Message>${escapeXml(body)}</Message></Response>`
  )
}

/** Extract Body from Twilio form POST (object or raw urlencoded string). */
export function extractTwilioBody(payload: unknown): string {
  return extractTwilioField(payload, 'Body')
}

/** Extract MessageSid from Twilio form POST (object or raw urlencoded string). */
export function extractTwilioMessageSid(payload: unknown): string {
  return extractTwilioField(payload, 'MessageSid')
}

function extractTwilioField(payload: unknown, key: string): string {
  if (payload == null) return ''
  if (typeof payload === 'string') {
    const params = new URLSearchParams(payload)
    return params.get(key)?.trim() ?? ''
  }
  if (typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[key]
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0].trim()
    }
  }
  return ''
}
