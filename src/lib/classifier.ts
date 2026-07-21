/**
 * Keyword classifier: maps free-text capture into a context list.
 * Pure function — easy to test and extend.
 *
 * Manual lists (no auto-routing): C2C to-do, LinkedIn, Meta.
 * Random is the fallback bucket when nothing matches (not a generic Inbox).
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

/**
 * Order matters: URL first, then more specific domain rules.
 * Timing words (today/tonight/tomorrow/this week) are handled separately
 * by the timing router and still queue into playlists.
 */
const RULES: Rule[] = [
  {
    listId: 'reading',
    reason: 'link',
    patterns: [URL_PATTERN],
  },
  {
    listId: 'linkedin-todo',
    reason: 'linkedin',
    patterns: [/\blinkedin\b/i],
  },
  {
    listId: 'instagram-todo',
    reason: 'instagram',
    patterns: [
      /\binstagram\b/i,
      /\big\b/i,
      /\breels?\b/i,
      /\bstory\b|\bstories\b/i,
    ],
  },
  {
    listId: 'appointments',
    reason: 'appointment',
    patterns: [
      /\bappointments?\b/i,
      /\bappts?\b/i,
      /\bapts?\b/i,
      /\bdentist\b/i,
      /\bdoctors?\b/i,
    ],
  },
  {
    listId: 'follow-ups',
    reason: 'follow-up',
    patterns: [
      /\bfollow[- ]?ups?\b/i,
      /\bemail\s+back\b/i,
      /\breply\s+to\b/i,
      /\bcircle\s+back\b/i,
      /\bcheck\s+in\s+with\b/i,
    ],
  },
  {
    listId: 'content-ideas',
    reason: 'idea',
    patterns: [/\bideas?\b/i, /\bbrainstorm\b/i],
  },
  {
    listId: 'errands',
    reason: 'errand',
    patterns: [
      /\bbuy\b/i,
      /\bpick\s*up\b/i,
      /\breturn\b/i,
      /\border\b/i,
      /\bbook(?:ing)?\b/i,
      /\btickets?\b/i,
      /\bflights?\b/i,
      /\btrains?\b/i,
      /\bamtrak\b/i,
      /\bhotels?\b/i,
      /\breservations?\b/i,
      /\b(plane|airplane|airline|airbnb|hostel|itinerary|travel)\b/i,
    ],
  },
  {
    listId: 'later',
    reason: 'later',
    patterns: [/\blater\b/i, /\bsomeday\b/i, /\beventually\b/i],
  },
  {
    listId: 'lovable',
    reason: 'lovable',
    patterns: [/\blovable\b/i],
  },
  {
    listId: 'content-todo',
    reason: 'content',
    patterns: [
      /\bfilm(?:ing)?\b/i,
      /\bedit(?:ing)?\b/i,
      /\brecord(?:ing)?\b/i,
      /\bscripts?\b/i,
      /\bthumbnails?\b/i,
      /\bposts?\b/i,
    ],
  },
  {
    listId: 'personal',
    reason: 'personal',
    patterns: [
      /\bgym\b/i,
      /\bgrocer(?:y|ies)\b/i,
      /\bmom\b/i,
      /\bdad\b/i,
      /\bpersonal\b/i,
      /\bself[- ]?care\b/i,
      /\bworkout\b/i,
      /\bfamily\b/i,
      /\btherapy\b/i,
      /\bmeditat(?:e|ion)\b/i,
    ],
  },
]

/**
 * Choose the best context list for a task string.
 * URLs always win; otherwise first matching keyword rule; else Random.
 */
export function classifyTask(text: string): ClassifyResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { listId: 'random', reason: 'empty' }
  }

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(trimmed))) {
      return { listId: rule.listId, reason: rule.reason }
    }
  }

  return { listId: 'random', reason: 'fallback' }
}
