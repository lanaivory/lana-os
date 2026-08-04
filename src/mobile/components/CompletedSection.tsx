import type { ContextList, Task } from '../../lib/types'
import { TaskRow } from './TaskRow'
import { ChevronIcon } from './icons'

type Props = {
  tasks: Task[]
  lists: ContextList[]
  open: boolean
  onToggleOpen: () => void
  onClear: () => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
}

/**
 * Finished work, folded away but reachable — and Clear lives here, next to the
 * things it would clear, rather than only in Settings.
 */
export function CompletedSection({
  tasks,
  lists,
  open,
  onToggleOpen,
  onClear,
  onToggleTask,
  onOpenTask,
}: Props) {
  if (tasks.length === 0) return null

  return (
    <section className="mos-completed" aria-label="Completed">
      <div className="mos-completed__bar">
        <button
          type="button"
          className="mos-completed__toggle"
          aria-expanded={open}
          onClick={onToggleOpen}
        >
          <ChevronIcon open={open} />
          Completed · {tasks.length}
        </button>
        <button type="button" className="mos-completed__clear" onClick={onClear}>
          Clear
        </button>
      </div>

      {open && (
        <ul className="mos-tasks">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              lists={lists}
              /* The queue above keeps a time column, so the fold does too. */
              alwaysShowTime
              onToggle={onToggleTask}
              onOpen={onOpenTask}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
