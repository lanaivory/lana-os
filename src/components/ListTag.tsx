import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ContextList } from '../lib/types'

type Props = {
  lists: ContextList[]
  listId: string
  onChange: (listId: string) => void
  onOpen?: () => void
}

/** One-click list refile control. */
export function ListTag({ lists, listId, onChange, onOpen }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = lists.find((l) => l.id === listId) ?? lists[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="list-tag" ref={ref}>
      <button
        type="button"
        className="list-tag__btn"
        style={{ '--tag': current?.color ?? '#8b919a' } as CSSProperties}
        onClick={(e) => {
          e.stopPropagation()
          onOpen?.()
          setOpen((v) => !v)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change list"
      >
        {current?.name ?? 'Random'}
      </button>
      {open && (
        <ul className="list-tag__menu" role="listbox">
          {lists.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                role="option"
                aria-selected={list.id === listId}
                className={list.id === listId ? 'is-active' : undefined}
                style={{ '--tag': list.color } as CSSProperties}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(list.id)
                  setOpen(false)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="list-tag__dot" />
                {list.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
