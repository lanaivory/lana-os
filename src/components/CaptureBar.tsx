import { useEffect, useRef, useState } from 'react'

type Props = {
  onCapture: (raw: string) => void
}

export function CaptureBar({ onCapture }: Props) {
  const [value, setValue] = useState('')
  const [pulse, setPulse] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pulse) return
    const t = window.setTimeout(() => setPulse(false), 520)
    return () => window.clearTimeout(t)
  }, [pulse])

  const submit = () => {
    const raw = value.trim()
    if (!raw) return
    onCapture(raw)
    setValue('')
    setPulse(true)
  }

  return (
    <section className={`capture ${pulse ? 'is-pulse' : ''}`}>
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
