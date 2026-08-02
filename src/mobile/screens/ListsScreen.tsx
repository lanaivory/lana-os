import type { CSSProperties } from 'react'
import type {
  MobileListOverview,
  MobileSearchHit,
} from '../../lib/mobileSelectors'
import type { ContextList } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { TaskRow } from '../components/TaskRow'
import { ArrowIcon, ChevronIcon, SearchIcon } from '../components/icons'

type Props = {
  overviews: MobileListOverview[]
  lists: ContextList[]
  query: string
  results: MobileSearchHit[]
  /** Reorder mode swaps the drill-in chevrons for up / down controls. */
  reordering: boolean
  onQueryChange: (query: string) => void
  onReorderingChange: (reordering: boolean) => void
  onOpenList: (listId: string) => void
  onMoveList: (listId: string, direction: -1 | 1) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
}

/**
 * Index of every context list. Typing searches across all of them at once,
 * including tasks already planned into a day.
 */
export function ListsScreen({
  overviews,
  lists,
  query,
  results,
  reordering,
  onQueryChange,
  onReorderingChange,
  onOpenList,
  onMoveList,
  onToggleTask,
  onOpenTask,
}: Props) {
  const searching = query.trim().length > 0

  return (
    <div className="mos-scroll">
      <div className="mos-toolbar">
        <label className="mos-field">
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder="Search every list"
            aria-label="Search tasks"
            onChange={(event) => onQueryChange(event.target.value)}
          />
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

      {searching ? (
        <section className="mos-results" aria-label="Search results">
          <p className="mos-day__caption">
            {results.length === 0
              ? 'No tasks match'
              : `${results.length} match${results.length === 1 ? '' : 'es'}`}
          </p>
          <ul className="mos-tasks">
            {results.map((hit) => (
              <TaskRow
                key={hit.task.id}
                task={hit.task}
                lists={lists}
                query={query}
                showListTag
                dayTag={hit.day ? PLAYLIST_META[hit.day].name : null}
                onToggle={onToggleTask}
                onOpen={onOpenTask}
              />
            ))}
          </ul>
        </section>
      ) : (
        <ul className="mos-index" aria-label="Lists">
          {overviews.map((overview, index) => (
            <li
              key={overview.list.id}
              className="mos-index__item"
              style={{ '--tag': overview.list.color } as CSSProperties}
            >
              <button
                type="button"
                className="mos-index__open"
                disabled={reordering}
                onClick={() => onOpenList(overview.list.id)}
              >
                <span className="mos-index__dot" aria-hidden />
                <span className="mos-index__text">
                  <span className="mos-index__name">{overview.list.name}</span>
                  <span className="mos-index__meta">
                    {overview.open === 0 ? 'All clear' : `${overview.open} open`}
                    {overview.planned > 0 && ` · ${overview.planned} planned`}
                  </span>
                </span>
                {!reordering && <ChevronIcon open={false} />}
              </button>

              {reordering && (
                <span className="mos-index__reorder">
                  <button
                    type="button"
                    className="mos-icon-btn"
                    disabled={index === 0}
                    aria-label={`Move ${overview.list.name} up`}
                    onClick={() => onMoveList(overview.list.id, -1)}
                  >
                    <ArrowIcon direction="up" />
                  </button>
                  <button
                    type="button"
                    className="mos-icon-btn"
                    disabled={index === overviews.length - 1}
                    aria-label={`Move ${overview.list.name} down`}
                    onClick={() => onMoveList(overview.list.id, 1)}
                  >
                    <ArrowIcon direction="down" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
