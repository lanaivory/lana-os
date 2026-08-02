import { useCallback, useState } from 'react'
import {
  loadMobilePrefs,
  saveMobilePrefs,
  type MobilePrefs,
} from '../../lib/mobilePrefs'

export type UpdateMobilePrefs = (
  updater: (prefs: MobilePrefs) => MobilePrefs,
) => void

/** Device-local view preferences, persisted on every change. */
export function useMobilePrefs(): [MobilePrefs, UpdateMobilePrefs] {
  const [prefs, setPrefs] = useState<MobilePrefs>(loadMobilePrefs)

  const update = useCallback<UpdateMobilePrefs>((updater) => {
    setPrefs((prev) => {
      const next = updater(prev)
      if (next === prev) return prev
      saveMobilePrefs(next)
      return next
    })
  }, [])

  return [prefs, update]
}
