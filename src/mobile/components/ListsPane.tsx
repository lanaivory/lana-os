import {
  LIST_SORT_LABELS,
  LIST_SORT_MODES,
  type ListSortMode,
} from '../../lib/listSort'
import type { MobileListSection } from '../../lib/mobileSelectors'
import type { ContextList } from '../../lib/types'
import { ListSection } from './ListSection'
import { SearchIcon } from './icons'

type Props = {
  sections: MobileListSection[]
  lists: ContextList[]
  query: string
  sort: ListSortMode
  reordering: boolean
  isCollapsed: (listId: string) => boolean
  onQueryChange: (query: string) => void
  onSortChange: (sort: ListSortMode) => void
  onReorderingChange: (reordering: boolean) => void
  onToggleCollapsed: (listId: string) => void
  onMoveList: (listId: string, direction: -1 | 1) => void
  onOpenListMenu: (listId: string) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onAddTask: (listId: string, text: string) => void
}

export function ListsPane({
  sections,
  lists,
  query,
  sort,
  reordering,
  isCollapsed,
  onQueryChange,
  onSortChange,
  onReorderingChange,
  onToggleCollapsed,
  onMoveList,
  onOpenListMenu,
  onToggleTask,
  onOpenTask,
  onAddTask,
}: Props) {
  return (
    <section className="mos-lists" aria-label="Lists">
      <div className="mos-lists__toolbar">
        <label className="mos-field">
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder="Filter tasks"
            aria-label="Filter tasks in lists"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <label className="mos-select">
          <span className="mos-visually-hidden">Sort lists</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as ListSortMode)}
          >
            {LIST_SORT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {LIST_SORT_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`mos-chip${reordering ? ' is-active' : ''}`}
          aria-pressed={reordering}
          onClick={() => onReorderingChange(!reordering)}
        >
          {reordering ? 'Done' : 'Reorder'}
        </button>
      </div>

      <div className="mos-lists__stack">
        {sections.map((section, index) => (
          <ListSection
            key={section.list.id}
            section={section}
            lists={lists}
            query={query}
            collapsed={isCollapsed(section.list.id)}
            reordering={reordering}
            canMoveUp={index > 0}
            canMoveDown={index < sections.length - 1}
            onToggleCollapsed={onToggleCollapsed}
            onMoveList={onMoveList}
            onOpenListMenu={onOpenListMenu}
            onToggleTask={onToggleTask}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>
    </section>
  )
}
