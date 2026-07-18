/**
 * Keyword classifier: maps free-text capture into a context list.
 * Pure function — easy to test and extend.
 */

export type ClassifyResult = {
  listId: string
  reason: string
}

const URL_PATTERN = /https?:\/\/\S+|www\.\S+/i

type Rule = {
  listId: string
  reason: string
  patterns: RegExp[]
}

const RULES: Rule[] = [
  {
    listId: 'reading',
    reason: 'link',
    patterns: [URL_PATTERN],
  },
  {
    listId: 'reading',
    reason: 'reading',
    patterns: [
      /\b(read|reading|article|essay|book|chapter|newsletter|paper)\b/i,
    ],
  },
  {
    listId: 'follow-up',
    reason: 'follow-up',
    patterns: [
      /\b(follow[- ]?up|followup|email|reply|respond|call|ping|check in|check-in|message|dm|text)\b/i,
    ],
  },
  {
    listId: 'errands',
    reason: 'errand',
    patterns: [
      /\b(errand|buy|purchase|pick up|pickup|grocery|groceries|pharmacy|post office|dry ?clean|return|drop off|dropoff|hardware|store)\b/i,
    ],
  },
  {
    listId: 'content',
    reason: 'content',
    patterns: [
      /\b(write|draft|blog|post|script|newsletter|tweet|thread|video|edit|publish|outline|content)\b/i,
    ],
  },
  {
    listId: 'personal',
    reason: 'personal',
    patterns: [
      /\b(personal|workout|gym|meditat|journal|family|health|doctor|dentist|therapy|self[- ]?care|habit)\b/i,
    ],
  },
]

/**
 * Choose the best context list for a task string.
 * URLs always win; otherwise first matching keyword rule; else Inbox.
 */
export function classifyTask(text: string): ClassifyResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { listId: 'inbox', reason: 'empty' }
  }

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(trimmed))) {
      return { listId: rule.listId, reason: rule.reason }
    }
  }

  return { listId: 'inbox', reason: 'fallback' }
}
