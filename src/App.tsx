import { DesktopApp } from './desktop/DesktopApp'
import { useLanaStore } from './hooks/useLanaStore'
import { useMediaQuery } from './hooks/useMediaQuery'
import { MOBILE_NATIVE_MQ } from './lib/mobileViewport'
import { MobileApp } from './mobile/MobileApp'

/**
 * One store, two views. The store lives here so rotating across the
 * breakpoint keeps board state and undo history intact.
 */
export default function App() {
  const store = useLanaStore()
  const mobile = useMediaQuery(MOBILE_NATIVE_MQ)

  return mobile ? <MobileApp store={store} /> : <DesktopApp store={store} />
}
