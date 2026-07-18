import type { PlaylistId } from './types'

/**
 * Timing-word router: detects schedule intent in free text
 * and returns the playlist that should receive a reference.
 */
export type TimingResult = {
  playlistId: PlaylistId | null
  matched: string | null
}

const TIMING_RULES: Array<{ playlistId: PlaylistId; pattern: RegExp }> = [
  {
    playlistId: 'today',
    pattern: /\b(today|tonight|this morning|this afternoon|this evening)\b/i,
  },
  {
    playlistId: 'tomorrow',
    pattern: /\b(tomorrow|tmrw|tmr)\b/i,
  },
  {
    playlistId: 'week',
    pattern: /\b(this week|later this week|by (?:the )?end of (?:the )?week)\b/i,
  },
]

export function routeTimingWords(text: string): TimingResult {
  for (const rule of TIMING_RULES) {
    const match = text.match(rule.pattern)
    if (match) {
      return { playlistId: rule.playlistId, matched: match[0] }
    }
  }
  return { playlistId: null, matched: null }
}
