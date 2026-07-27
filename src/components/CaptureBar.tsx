import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  onCapture: (raw: string) => void
}

/**
 * Keep the capture bar flush above the iOS keyboard by sizing the app shell
 * to the visual viewport while focused (avoids the extra gap / jump).
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
      root.style.removeProperty('transform')
      root.style.removeProperty('--keyboard-inset')
      root.classList.remove('os--keyboard-open')
    }

    if (!focused) {
      clear()
      return
    }

    const sync = () => {
      const offsetTop = vv.offsetTop
      const height = vv.height
      const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop)
      const open = keyboardInset > 24

      root.style.height = `${height}px`
      root.style.maxHeight = `${height}px`
      root.style.minHeight = `${height}px`
      root.style.transform = offsetTop ? `translateY(${offsetTop}px)` : ''
      root.style.setProperty('--keyboard-inset', `${keyboardInset}px`)
      root.classList.toggle('os--keyboard-open', open)

      // iOS sometimes scrolls the layout viewport when focusing inputs.
      if (window.scrollY !== 0) window.scrollTo(0, 0)
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

  useCaptureKeyboardInset(focused)

  useEffect(() => {
    if (!pulse) return
    const t = window.setTimeout(() => setPulse(false), 520)
    return () => window.clearTimeout(t)
  }, [pulse])

  const submit = useCallback(() => {
    const raw = value.trim()
    if (!raw) return
    onCapture(raw)
    setValue('')
    setPulse(true)
  }, [onCapture, value])

  return (
    <section
      className={`capture ${pulse ? 'is-pulse' : ''} ${focused ? 'is-focused' : ''}`}
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
          onClick={submit}
          disabled={!value.trim()}
        >
          Capture
        </button>
      </div>
    </section>
  )
}
