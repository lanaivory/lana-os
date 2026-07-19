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

/**
 * Order matters: more specific scheduling / communication rules first.
 * URLs always win. Inbox only when nothing matches.
 */
const RULES: Rule[] = [
  {
    listId: 'reading',
    reason: 'link',
    patterns: [URL_PATTERN],
  },
  {
    listId: 'errands',
    reason: 'travel',
    patterns: [
      /\b(flight|flights|plane|airplane|airline)\b/i,
      /\b(train|trains|train\s+tickets?)\b/i,
      /\b(hotel|hotels|airbnb|hostel)\b/i,
      /\b(reservation|reservations|reserve)\b/i,
      /\b(trip|trips|travel|itinerary)\b/i,
    ],
  },
  {
    listId: 'appointments',
    reason: 'appointment',
    patterns: [
      /\b(appt|appointment|appointments)\b/i,
      /\b(book|booking)\b/i,
      /\b((make|set\s*up|schedule|schedules?)\s+(an?\s+)?(appointment|appt|meeting))\b/i,
      /\b(dentist|doctor|dr\.?|vet|veterinary|haircut|hair\s*cut|nails?|manicure|pedicure|salon|barber)\b/i,
      /\b(meeting\s+with)\b/i,
      /\b(checkup|check[- ]up|physical|dental\s+cleaning)\b/i,
    ],
  },
  {
    listId: 'follow-up',
    reason: 'follow-up',
    patterns: [
      /\b(follow[- ]?up|followup)\b/i,
      /\b(email|e-mail|reply|respond|reach\s*out|ping)\b/i,
      /\b(call|text|message|dm|dms|sms)\b/i,
      /\b(check\s*in|check-in)\b/i,
    ],
  },
  {
    listId: 'errands',
    reason: 'errand',
    patterns: [
      /\b(errand|errands)\b/i,
      /\b(buy|purchase|grab|order|get)\b/i,
      /\b(pick\s*up|pickup|drop\s*off|dropoff)\b/i,
      /\b(return|returns)\b/i,
      /\b(grocery|groceries|pharmacy|post\s*office|dry\s*clean|hardware|store)\b/i,
    ],
  },
  {
    listId: 'content',
    reason: 'content',
    patterns: [
      /\b(content|carousel|reel|reels|thumbnail|caption|captions)\b/i,
      /\b(post|posts|publish|tweet|thread|blog)\b/i,
      /\b(edit|film|filming|script|scripts|outline|draft|write)\b/i,
      /\b(video|newsletter)\b/i,
    ],
  },
  {
    listId: 'reading',
    reason: 'reading',
    patterns: [
      /\b(read|reading|article|essay|book|chapter|paper|skim)\b/i,
    ],
  },
  {
    listId: 'personal',
    reason: 'personal',
    patterns: [
      /\b(personal|self[- ]?care|selfcare)\b/i,
      /\b(health|wellness|workout|gym|meditat|journal|family|habit|habits|stretch|walk)\b/i,
      /\b(therapy|therapist)\b/i,
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
