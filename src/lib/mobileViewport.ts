/** Mobile-native vertical list stack breakpoint — keep in sync with App.css max-width: 768px. */
export const MOBILE_NATIVE_MQ = '(max-width: 768px)'

/** True for phones / narrow viewports (incl. installed iOS PWA on phone). */
export function isMobileNativeViewport(
  win: Pick<Window, 'matchMedia'> | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
): boolean {
  if (!win?.matchMedia) return false
  return win.matchMedia(MOBILE_NATIVE_MQ).matches
}
