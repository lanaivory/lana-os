import type { CSSProperties } from 'react'
import { PLAYLIST_CARD_IDS } from '../../lib/board'
import type { TaskLocation } from '../../lib/mobileSelectors'
import type { ContextList, PlaylistId, Task } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { Sheet } from './Sheet'
import { CheckIcon } from './icons'

const WHEN_LABELS: Record<PlaylistId, string> = {
  today: PLAYLIST_META.today.name,
  tomorrow: PLAYLIST_META.tomorrow.name,
  week: 'This week',
}

type Props = {
  task: Task | null
  lists: ContextList[]
  location: TaskLocation | null
  onClose: () => void
  onPlan: (taskId: string, day: PlaylistId | null) => void
  onListChange: (taskId: string, listId: string) => void
}

/**
 * Where a task goes, reached from the row itself rather than through the edit
 * sheet. Every choice here applies on the tap and closes — a move is one
 * decision, so it does not need a draft or a Save.
 */
export function MoveSheet({
  task,
  lists,
  location,
  onClose,
  onPlan,
  onListChange,
}: Props) {
  if (!task) return null

  const day = location?.kind === 'agenda' ? location.day : null

  return (
    <Sheet open title="Move" onClose={onClose}>
      <div className="mos-field-block">
        <span className="mos-field-block__label">To a day</span>
        <div className="mos-segments mos-segments--three">
          {PLAYLIST_CARD_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`mos-segment${day === id ? ' is-active' : ''}`}
              aria-pressed={day === id}
              onClick={() => {
                // Tapping the day it is already on takes it off the plan.
                onPlan(task.id, day === id ? null : id)
                onClose()
              }}
            >
              {WHEN_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="mos-field-block">
        <span className="mos-field-block__label">To a list</span>
        <ul className="mos-pick">
          {lists.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                className="mos-pick__item"
                style={{ '--tag': list.color } as CSSProperties}
                aria-pressed={list.id === task.listId}
                onClick={() => {
                  if (list.id !== task.listId) onListChange(task.id, list.id)
                  onClose()
                }}
              >
                <span className="mos-pick__dot" aria-hidden />
                <span className="mos-pick__text">{list.name}</span>
                {list.id === task.listId && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}
