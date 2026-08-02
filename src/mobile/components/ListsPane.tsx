import { useState } from 'react'
import { LIST_SORT_LABELS, type ListSortMode } from '../../lib/listSort'
import type { MobileListSection } from '../../lib/mobileSelectors'
import type { ContextList } from '../../lib/types'
import { ListSection } from './ListSection'
import { SortSheet } from './SortSheet'
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
  const [sortOpen, setSortOpen] = useState(false)

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

        <button
          type="button"
          className={`mos-chip${sort === 'custom' ? '' : ' is-active'}`}
          aria-label={`Sort lists, currently ${LIST_SORT_LABELS[sort]}`}
          onClick={() => setSortOpen(true)}
        >
          {LIST_SORT_LABELS[sort]}
        </button>

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

      <SortSheet
        open={sortOpen}
        sort={sort}
        onClose={() => setSortOpen(false)}
        onSelect={onSortChange}
      />
    </section>
  )
}
