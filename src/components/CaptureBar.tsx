import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'

type Props = {
  onCapture: (raw: string) => void
}

/**
 * Keep the capture bar flush above the iOS keyboard by sizing the app shell
 * to the visual viewport while focused (avoids the extra gap / jump).
 * Also counters visualViewport offset so the bar layout does not shift sideways.
 * Always restores shell metrics on blur so the bar cannot unmount/hide mid-session.
 */
function useCaptureKeyboardInset(focused: boolean) {
  useEffect(() => {
    const root = document.querySelector('.os')
    if (!(root instanceof HTMLElement)) return

    const vv = window.visualViewport
    if (!vv) return

    const clear = () => {
      root.style.removeProperty('height')
      root.style.removeProperty('max-height')
      root.style.removeProperty('min-height')
      root.style.removeProperty('width')
      root.style.removeProperty('max-width')
      root.style.removeProperty('transform')
      root.style.removeProperty('--keyboard-inset')
      root.classList.remove('os--keyboard-open')
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }

    if (!focused) {
      clear()
      return
    }

    const sync = () => {
      const offsetTop = vv.offsetTop
      const offsetLeft = vv.offsetLeft
      // Guard against transient 0-height frames during keyboard animation.
      const height = Math.max(vv.height, window.innerHeight * 0.45)
      const width = Math.max(vv.width, 200)
      const keyboardInset = Math.max(0, window.innerHeight - vv.height - offsetTop)
      const open = keyboardInset > 24

      root.style.height = `${height}px`
      root.style.maxHeight = `${height}px`
      root.style.minHeight = `${height}px`
      root.style.width = `${width}px`
      root.style.maxWidth = `${width}px`
      root.style.transform =
        offsetTop || offsetLeft
          ? `translate(${offsetLeft}px, ${offsetTop}px)`
          : ''
      root.style.setProperty('--keyboard-inset', `${keyboardInset}px`)
      root.classList.toggle('os--keyboard-open', open)

      // iOS sometimes scrolls the layout viewport when focusing inputs.
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      clear()
    }
  }, [focused])
}

export function CaptureBar({ onCapture }: Props) {
  const [value, setValue] = useState('')
  const [pulse, setPulse] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)

  useCaptureKeyboardInset(focused)

  useEffect(() => {
    if (!pulse) return
    const t = window.setTimeout(() => setPulse(false), 520)
    return () => window.clearTimeout(t)
  }, [pulse])

  const submit = useCallback(() => {
    const raw = value.trim()
    if (!raw || submitting.current) return
    submitting.current = true
    onCapture(raw)
    setValue('')
    setPulse(true)
    // Dismiss keyboard so the board snap/highlight is visible.
    inputRef.current?.blur()
    // Hold the guard through the click that follows pointerdown on iOS/desktop.
    window.setTimeout(() => {
      submitting.current = false
    }, 400)
  }, [onCapture, value])

  const submitFromPointer = useCallback(
    (e: PointerEvent | MouseEvent) => {
      // Prevent the button from stealing focus / blurring the input before click.
      // Without this, iOS treats the first tap as "dismiss keyboard" only.
      e.preventDefault()
      if (!value.trim()) return
      submit()
    },
    [submit, value],
  )

  return (
    <section
      className={`capture ${pulse ? 'is-pulse' : ''} ${focused ? 'is-focused' : ''}`}
      data-capture-bar
      aria-label="Quick capture"
    >
      <div className="capture__shell">
        <span className="capture__plus" aria-hidden>
          +
        </span>
        <input
          ref={inputRef}
          className="capture__input"
          placeholder="Capture a thought… Enter to add"
          value={value}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          aria-label="Quick capture"
        />
        <button
          type="button"
          className="capture__go"
          onPointerDown={submitFromPointer}
          onMouseDown={submitFromPointer}
          onClick={(e) => {
            // Keyboard activation lands here; pointer path is guarded against double-fire.
            e.preventDefault()
            submit()
          }}
          disabled={!value.trim()}
        >
          Capture
        </button>
      </div>
    </section>
  )
}
