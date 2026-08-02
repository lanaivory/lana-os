import { useEffect } from 'react'
import { loadPasscode } from '../../lib/passcode'

const SWEEP_MS = 5 * 60 * 1000

/**
 * Nudge the server to send any commitment reminders that have come due.
 *
 * This is the timely path: Vercel's Hobby plan only allows a daily cron, so the
 * scheduled run is a once-a-day backstop and the app sweeps whenever it is open
 * or comes back to the foreground. The endpoint marks each reminder as it
 * sends, so calling it twice sends nothing twice.
 */
export function useReminderSweep(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const sweep = () => {
      const pass = loadPasscode()
      void fetch('/api/reminders', {
        method: 'POST',
        headers: pass ? { 'x-app-pass': pass } : {},
      }).catch(() => {
        // Offline, or reminders are not configured — nothing to recover from.
      })
    }

    sweep()
    const timer = window.setInterval(sweep, SWEEP_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') sweep()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])
}
