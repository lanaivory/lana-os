import { useRef, useState } from 'react'
import { PlusIcon } from './icons'

type Props = {
  onAdd: (text: string) => void
}

/** Inline "add a task to this list" composer. */
export function ListComposer({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const committing = useRef(false)

  const commit = () => {
    const text = value.trim()
    if (!text || committing.current) return
    committing.current = true
    onAdd(text)
    setValue('')
    // Stay open so several tasks can be added in a row.
    queueMicrotask(() => {
      committing.current = false
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        className="mos-composer__open"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Add task
      </button>
    )
  }

  return (
    <form
      className="mos-composer"
      onSubmit={(event) => {
        event.preventDefault()
        commit()
      }}
    >
      <input
        autoFocus
        className="mos-composer__input"
        value={value}
        placeholder="Task title"
        enterKeyHint="done"
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setValue('')
            setOpen(false)
          }
        }}
        onBlur={() => {
          // iOS blurs before the Add tap lands, so save whatever was typed.
          if (value.trim()) commit()
          else setOpen(false)
        }}
      />
      <button
        type="submit"
        className="mos-composer__submit"
        disabled={!value.trim()}
        onPointerDown={(event) => {
          event.preventDefault()
          commit()
        }}
      >
        Add
      </button>
    </form>
  )
}
