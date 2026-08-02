import type { CSSProperties } from 'react'
import type { MobileListSection } from '../../lib/mobileSelectors'
import { ListComposer } from './ListComposer'
import { TaskRow } from './TaskRow'
import { ArrowIcon, ChevronIcon, MoreIcon } from './icons'
import type { ContextList } from '../../lib/types'

type Props = {
  section: MobileListSection
  lists: ContextList[]
  query: string
  collapsed: boolean
  /** Reorder mode swaps the list menu for up / down controls. */
  reordering: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onToggleCollapsed: (listId: string) => void
  onMoveList: (listId: string, direction: -1 | 1) => void
  onOpenListMenu: (listId: string) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onAddTask: (listId: string, text: string) => void
}

export function ListSection({
  section,
  lists,
  query,
  collapsed,
  reordering,
  canMoveUp,
  canMoveDown,
  onToggleCollapsed,
  onMoveList,
  onOpenListMenu,
  onToggleTask,
  onOpenTask,
  onAddTask,
}: Props) {
  const { list, tasks, total } = section
  const filtering = query.trim().length > 0

  return (
    <section
      className={`mos-list${collapsed ? ' is-collapsed' : ''}`}
      style={{ '--tag': list.color } as CSSProperties}
      data-mos-list={list.id}
    >
      <header className="mos-list__head">
        <button
          type="button"
          className="mos-list__toggle"
          aria-expanded={!collapsed}
          onClick={() => onToggleCollapsed(list.id)}
        >
          <ChevronIcon open={!collapsed} />
          <span className="mos-list__dot" aria-hidden />
          <span className="mos-list__name">{list.name}</span>
          <span className="mos-list__count">
            {filtering ? `${tasks.length}/${total}` : total}
          </span>
        </button>

        {reordering ? (
          <span className="mos-list__reorder">
            <button
              type="button"
              className="mos-icon-btn"
              disabled={!canMoveUp}
              aria-label={`Move ${list.name} up`}
              onClick={() => onMoveList(list.id, -1)}
            >
              <ArrowIcon direction="up" />
            </button>
            <button
              type="button"
              className="mos-icon-btn"
              disabled={!canMoveDown}
              aria-label={`Move ${list.name} down`}
              onClick={() => onMoveList(list.id, 1)}
            >
              <ArrowIcon direction="down" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="mos-icon-btn"
            aria-label={`Options for ${list.name}`}
            onClick={() => onOpenListMenu(list.id)}
          >
            <MoreIcon />
          </button>
        )}
      </header>

      {!collapsed && !reordering && (
        <div className="mos-list__body">
          {tasks.length === 0 ? (
            <p className="mos-list__empty">
              {filtering ? 'No matches in this list' : 'Nothing here yet'}
            </p>
          ) : (
            <ul className="mos-tasks">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  lists={lists}
                  query={query}
                  onToggle={onToggleTask}
                  onOpen={onOpenTask}
                />
              ))}
            </ul>
          )}
          {!filtering && (
            <ListComposer onAdd={(text) => onAddTask(list.id, text)} />
          )}
        </div>
      )}
    </section>
  )
}
