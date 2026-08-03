import type { CSSProperties } from 'react'
import { LIST_SORT_LABELS, type ListSortMode } from '../../lib/listSort'
import type { MobileListSection } from '../../lib/mobileSelectors'
import type { ContextList } from '../../lib/types'
import { TaskRow } from '../components/TaskRow'

type Props = {
  section: MobileListSection
  lists: ContextList[]
  sort: ListSortMode
  /** Owned tasks that live on the Playlist tab right now. */
  plannedCount: number
  onOpenSort: () => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
}

/**
 * One context list, drilled into from the Lists index. Adding happens in the
 * capture bar on the app's bottom edge, which addresses this list while it is
 * open, so the screen itself carries no second input.
 */
export function ListDetailScreen({
  section,
  lists,
  sort,
  plannedCount,
  onOpenSort,
  onToggleTask,
  onOpenTask,
}: Props) {
  const { list, tasks } = section
  const open = tasks.filter((task) => !task.completed).length

  return (
    <div
      className="mos-scroll"
      style={{ '--tag': list.color } as CSSProperties}
    >
      <div className="mos-detail__bar">
        <p className="mos-day__caption">
          {open === 0 ? 'All clear' : `${open} open`}
          {plannedCount > 0 && ` · ${plannedCount} planned`}
        </p>
        <button
          type="button"
          className={`mos-chip${sort === 'custom' ? '' : ' is-active'}`}
          aria-label={`Sort tasks, currently ${LIST_SORT_LABELS[sort]}`}
          onClick={onOpenSort}
        >
          {LIST_SORT_LABELS[sort]}
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="mos-empty">
          {plannedCount > 0
            ? 'Everything in this list is planned into a day.'
            : 'Nothing here yet — add one below.'}
        </p>
      ) : (
        <ul className="mos-tasks">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              lists={lists}
              contextListId={list.id}
              onToggle={onToggleTask}
              onOpen={onOpenTask}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
