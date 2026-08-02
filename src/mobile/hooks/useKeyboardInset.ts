import { useEffect, type RefObject } from 'react'

/** Below this, the difference is browser chrome rather than a keyboard. */
const KEYBOARD_MIN_PX = 24

/**
 * iOS does not shrink the layout viewport when the keyboard opens, so a
 * `100dvh` shell keeps its bottom edge underneath the keys. Track the visual
 * viewport instead and pin the shell to it, so the capture bar stays visible.
 */
export function useKeyboardInset(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current
    const viewport = window.visualViewport
    if (!root || !viewport) return

    const sync = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      )

      if (inset <= KEYBOARD_MIN_PX) {
        root.style.removeProperty('height')
        root.style.removeProperty('transform')
        root.classList.remove('is-keyboard-open')
        return
      }

      root.style.height = `${viewport.height}px`
      root.style.transform = viewport.offsetTop
        ? `translateY(${viewport.offsetTop}px)`
        : ''
      root.classList.add('is-keyboard-open')
    }

    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    return () => {
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
      root.style.removeProperty('height')
      root.style.removeProperty('transform')
      root.classList.remove('is-keyboard-open')
    }
  }, [rootRef])
}
