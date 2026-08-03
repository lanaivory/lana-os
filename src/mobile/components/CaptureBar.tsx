import { useRef, useState } from 'react'

type Props = {
  /** Says where the text will land; inside a list that is the list itself. */
  placeholder?: string
  /** Set where nothing opens on top, so several can be added in a row. */
  stayFocused?: boolean
  onCapture: (raw: string) => void
}

/**
 * The one text field on the app's bottom edge. On the Playlist and the Lists
 * index it feeds the shared capture pipeline (split, classify, timing words),
 * so "call mum tomorrow" lands in a list and on a day without any extra taps.
 * Inside a list it adds to that list, so a screen never has two places to type.
 */
export function CaptureBar({
  placeholder = 'Capture a thought…',
  stayFocused = false,
  onCapture,
}: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const committing = useRef(false)

  const submit = () => {
    const raw = value.trim()
    if (!raw || committing.current) return
    committing.current = true
    onCapture(raw)
    setValue('')
    // Drop the keyboard so the sheet that opens over it is readable.
    if (!stayFocused) inputRef.current?.blur()
    window.setTimeout(() => {
      committing.current = false
    }, 300)
  }

  return (
    <form
      className="mos-capture"
      aria-label={placeholder}
      // The bar is one target: a tap anywhere in it opens the keyboard, rather
      // than only the field's own text box.
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        inputRef.current?.focus()
      }}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <input
        ref={inputRef}
        className="mos-capture__input"
        value={value}
        placeholder={placeholder}
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="on"
        aria-label={placeholder}
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
