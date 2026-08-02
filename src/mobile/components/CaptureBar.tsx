import { useRef, useState } from 'react'

type Props = {
  onCapture: (raw: string) => void
}

/**
 * Always-available capture. Text is routed by the shared capture pipeline
 * (split, classify, timing words), so "call mum tomorrow" lands in a list and
 * on a day without any extra taps.
 */
export function CaptureBar({ onCapture }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const committing = useRef(false)

  const submit = () => {
    const raw = value.trim()
    if (!raw || committing.current) return
    committing.current = true
    onCapture(raw)
    setValue('')
    // Drop the keyboard so the reveal animation on the destination is visible.
    inputRef.current?.blur()
    window.setTimeout(() => {
      committing.current = false
    }, 300)
  }

  return (
    <form
      className="mos-capture"
      aria-label="Quick capture"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <input
        ref={inputRef}
        className="mos-capture__input"
        value={value}
        placeholder="Capture a thought…"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="on"
        aria-label="Capture a thought"
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="submit"
        className="mos-capture__submit"
        disabled={!value.trim()}
        onPointerDown={(event) => {
          // Without this the first tap only dismisses the iOS keyboard.
          event.preventDefault()
          submit()
        }}
      >
        Add
      </button>
    </form>
  )
}
