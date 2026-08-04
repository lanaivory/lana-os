import { useMemo, useState, type CSSProperties } from 'react'
import type { ContextList } from '../../lib/types'
import { Sheet } from './Sheet'
import { CheckIcon, SearchIcon } from './icons'

type Props = {
  open: boolean
  lists: ContextList[]
  selectedId: string | null
  onClose: () => void
  onSelect: (listId: string) => void
}

/** The full list of lists, searchable — the "More…" behind the chips. */
export function ListPickerSheet({
  open,
  lists,
  selectedId,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return lists
    return lists.filter((list) => list.name.toLowerCase().includes(needle))
  }, [lists, query])

  const close = () => {
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={open} title="Choose a list" layer="stacked" onClose={close}>
      <label className="mos-field">
        <SearchIcon />
        <input
          type="search"
          value={query}
          placeholder="Find a list"
          aria-label="Find a list"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {matches.length === 0 ? (
        <p className="mos-sheet__message">No list matches.</p>
      ) : (
        <ul className="mos-pick">
          {matches.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                className="mos-pick__item"
                style={{ '--tag': list.color } as CSSProperties}
                aria-pressed={list.id === selectedId}
                onClick={() => {
                  onSelect(list.id)
                  close()
                }}
              >
                <span className="mos-pick__dot" aria-hidden />
                <span className="mos-pick__text">{list.name}</span>
                {list.id === selectedId && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
