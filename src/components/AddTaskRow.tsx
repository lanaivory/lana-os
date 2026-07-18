import { useState } from 'react'

type Props = {
  onAdd: (text: string) => void
  placeholder?: string
}

export function AddTaskRow({ onAdd, placeholder = '+ Add task' }: Props) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

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
        const text = value.trim()
        if (!text) return
        onAdd(text)
        setValue('')
        setOpen(false)
      }}
    >
      <input
        autoFocus
        value={value}
        placeholder="Task title"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            setValue('')
          }
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false)
        }}
      />
      <button type="submit" disabled={!value.trim()}>
        Add
      </button>
    </form>
  )
}
