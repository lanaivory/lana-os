import { useState } from 'react'
import { Sheet } from './Sheet'

type Props = {
  open: boolean
  title: string
  label: string
  submitLabel: string
  onCancel: () => void
  onSubmit: (value: string) => void
}

/** Single-field sheet, used instead of `window.prompt` on touch. */
export function PromptSheet({
  open,
  title,
  label,
  submitLabel,
  onCancel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState('')

  if (!open) return null

  const close = () => {
    setValue('')
    onCancel()
  }

  return (
    <Sheet open title={title} onClose={close} layer="stacked">
      <form
        className="mos-prompt"
        onSubmit={(event) => {
          event.preventDefault()
          const text = value.trim()
          if (!text) return
          setValue('')
          onSubmit(text)
        }}
      >
        <input
          autoFocus
          className="mos-sheet__title-input"
          value={value}
          placeholder={label}
          aria-label={label}
          enterKeyHint="done"
          onChange={(event) => setValue(event.target.value)}
        />
        <button
          type="submit"
          className="mos-btn mos-btn--accent"
          disabled={!value.trim()}
        >
          {submitLabel}
        </button>
      </form>
    </Sheet>
  )
}
