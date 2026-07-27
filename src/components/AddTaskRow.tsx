import { useRef, useState } from 'react'

type Props = {
  onAdd: (text: string) => void
  placeholder?: string
}

export function AddTaskRow({ onAdd, placeholder = '+ Add task' }: Props) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const submitting = useRef(false)

  const commit = (raw: string, formEl?: HTMLFormElement | null) => {
    const text = raw.trim()
    if (!text || submitting.current) return false
    submitting.current = true
    onAdd(text)
    setValue('')
    setOpen(false)
    // Reveal the new row if the card body is height-capped and scrolled up.
    const scroll = formEl?.closest('.card')?.querySelector('.card__scroll')
    if (scroll instanceof HTMLElement) {
      requestAnimationFrame(() => {
        scroll.scrollTop = scroll.scrollHeight
      })
    }
    // Allow a later open/submit in the same tick after React processes.
    queueMicrotask(() => {
      submitting.current = false
    })
    return true
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-row"
        onClick={() => setOpen(true)}
      >
        {placeholder}
      </button>
    )
  }

  return (
    <form
      className="add-row add-row--form"
      onSubmit={(e) => {
        e.preventDefault()
        commit(value, e.currentTarget)
      }}
    >
      <input
        autoFocus
        value={value}
        placeholder="Task title"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="on"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            setValue('')
          }
        }}
        onBlur={(e) => {
          // iOS often blurs before the Add tap registers — save on blur.
          const form = e.currentTarget.form
          if (value.trim()) {
            commit(value, form)
            return
          }
          setOpen(false)
        }}
      />
      <button
        type="submit"
        disabled={!value.trim()}
        onPointerDown={(e) => {
          // Keep focus long enough for submit; still commit explicitly.
          e.preventDefault()
          const form = (e.currentTarget as HTMLButtonElement).form
          commit(value, form)
        }}
      >
        Add
      </button>
    </form>
  )
}
