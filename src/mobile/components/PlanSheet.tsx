import { useMemo, useState, type CSSProperties } from 'react'
import { listSections } from '../../lib/mobileSelectors'
import type { AppState, PlaylistId } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { Sheet } from './Sheet'
import { PlusIcon, SearchIcon } from './icons'

type Props = {
  open: boolean
  state: AppState
  day: PlaylistId
  onClose: () => void
  onPlan: (taskId: string, day: PlaylistId) => void
}

/**
 * Pull unplanned tasks into a day. Planned tasks leave the pool as they are
 * added, so the sheet can stay open while several are picked in a row.
 */
export function PlanSheet({ open, state, day, onClose, onPlan }: Props) {
  const [query, setQuery] = useState('')

  const sections = useMemo(() => {
    if (!open) return []
    return listSections(state, { query })
      .map((section) => ({
        ...section,
        tasks: section.tasks.filter((task) => !task.completed),
      }))
      .filter((section) => section.tasks.length > 0)
  }, [open, state, query])

  const close = () => {
    setQuery('')
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={`Add to ${PLAYLIST_META[day].name}`}
      onClose={close}
    >
      <label className="mos-field">
        <SearchIcon />
        <input
          type="search"
          value={query}
          placeholder="Find a task"
          aria-label="Find a task to plan"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {sections.length === 0 ? (
        <p className="mos-sheet__message">
          {query.trim()
            ? 'No unplanned task matches.'
            : 'Every task is already planned into a day.'}
        </p>
      ) : (
        sections.map((section) => (
          <section
            key={section.list.id}
            className="mos-group"
            style={{ '--tag': section.list.color } as CSSProperties}
          >
            <h3 className="mos-group__title">{section.list.name}</h3>
            <ul className="mos-pick">
              {section.tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="mos-pick__item"
                    onClick={() => onPlan(task.id, day)}
                  >
                    <span className="mos-pick__text">{task.text}</span>
                    <PlusIcon />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Sheet>
  )
}
