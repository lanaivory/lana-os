import type { CSSProperties } from 'react'
import type {
  MobileListOverview,
  MobileSearchHit,
} from '../../lib/mobileSelectors'
import type { TriageCard } from '../../lib/triage'
import type { ContextList } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { TaskRow } from '../components/TaskRow'
import { TriageBanner } from '../components/TriageBanner'
import { ArrowIcon, PinIcon, SearchIcon } from '../components/icons'
import { usePinGesture } from '../hooks/usePinGesture'

type Props = {
  overviews: MobileListOverview[]
  lists: ContextList[]
  query: string
  results: MobileSearchHit[]
  /** Reorder mode swaps the drill-in chevrons for up / down controls. */
  reordering: boolean
  triage: TriageCard[]
  triageTotal: number
  onQueryChange: (query: string) => void
  onReorderingChange: (reordering: boolean) => void
  onOpenList: (listId: string) => void
  onMoveList: (listId: string, direction: -1 | 1) => void
  onTogglePin: (listId: string) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onTriageFile: (taskId: string, listId: string) => void
  onTriageKeep: (taskId: string) => void
  onTriageToday: (taskId: string) => void
}

function ListIndexRow({
  overview,
  reordering,
  first,
  last,
  onOpen,
  onMove,
  onTogglePin,
}: {
  overview: MobileListOverview
  reordering: boolean
  first: boolean
  last: boolean
  onOpen: () => void
  onMove: (direction: -1 | 1) => void
  onTogglePin: () => void
}) {
  const { handlers, consumedTap } = usePinGesture(onTogglePin)
  const { list } = overview

  return (
    <li
      className="mos-index__item"
      style={{ '--tag': list.color } as CSSProperties}
    >
      <button
        type="button"
        className="mos-index__open"
        disabled={reordering}
        {...handlers}
        onClick={() => {
          if (consumedTap()) return
          onOpen()
        }}
      >
        <span className="mos-index__dot" aria-hidden />
        <span className="mos-index__text">
          <span className="mos-index__name">{list.name}</span>
          <span className="mos-index__meta">
            {overview.open === 0 ? 'All clear' : `${overview.open} open`}
            {overview.planned > 0 && ` · ${overview.planned} planned`}
          </span>
        </span>
      </button>

      {reordering ? (
        <>
          {list.pinned && (
            <span className="mos-index__pin is-marker" aria-label="Pinned">
              <PinIcon filled />
            </span>
          )}
          <span className="mos-index__reorder">
            <button
              type="button"
              className="mos-icon-btn"
              disabled={first}
              aria-label={`Move ${list.name} up`}
              onClick={() => onMove(-1)}
            >
              <ArrowIcon direction="up" />
            </button>
            <button
              type="button"
              className="mos-icon-btn"
              disabled={last}
              aria-label={`Move ${list.name} down`}
              onClick={() => onMove(1)}
            >
              <ArrowIcon direction="down" />
            </button>
          </span>
        </>
      ) : (
        /* Always present: a pin you cannot see is a pin nobody finds. */
        <button
          type="button"
          className={`mos-index__pin${list.pinned ? '' : ' is-off'}`}
          aria-pressed={list.pinned}
          aria-label={`${list.pinned ? 'Unpin' : 'Pin'} ${list.name}`}
          onClick={onTogglePin}
        >
          <PinIcon filled={list.pinned} />
        </button>
      )}
    </li>
  )
}

/**
 * Index of every context list, pinned ones first. Typing searches across all
 * of them at once, including tasks already planned into a day.
 */
export function ListsScreen({
  overviews,
  lists,
  query,
  results,
  reordering,
  triage,
  triageTotal,
  onQueryChange,
  onReorderingChange,
  onOpenList,
  onMoveList,
  onTogglePin,
  onToggleTask,
  onOpenTask,
  onTriageFile,
  onTriageKeep,
  onTriageToday,
}: Props) {
  const searching = query.trim().length > 0
  const pinned = overviews.filter((o) => o.list.pinned)
  const rest = overviews.filter((o) => !o.list.pinned)

  const renderList = (group: MobileListOverview[], label?: string) => (
    <section className="mos-group" aria-label={label ?? 'Lists'}>
      {label && <h2 className="mos-group__title">{label}</h2>}
      <ul className="mos-index">
        {group.map((overview) => (
          <ListIndexRow
            key={overview.list.id}
            overview={overview}
            reordering={reordering}
            first={overviews.indexOf(overview) === 0}
            last={overviews.indexOf(overview) === overviews.length - 1}
            onOpen={() => onOpenList(overview.list.id)}
            onMove={(direction) => onMoveList(overview.list.id, direction)}
            onTogglePin={() => onTogglePin(overview.list.id)}
          />
        ))}
      </ul>
    </section>
  )

  /*
   * Reordering moves a list within one flat board order, so it is shown as one
   * flat order. Splitting Pinned off here would make a row leap between
   * sections on a single tap of Move up.
   */
  if (reordering) {
    return (
      <div className="mos-scroll">
        <div className="mos-toolbar">
          <p className="mos-day__caption mos-toolbar__note">
            Move lists with the arrows
          </p>
          <button
            type="button"
            className="mos-chip is-active"
            aria-pressed
            onClick={() => onReorderingChange(false)}
          >
            Done
          </button>
        </div>
        {renderList(overviews)}
      </div>
    )
  }

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
          className="mos-chip"
          onClick={() => onReorderingChange(true)}
        >
          Reorder
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
                dayLabel={hit.day ? PLAYLIST_META[hit.day].name : null}
                onToggle={onToggleTask}
                onOpen={onOpenTask}
              />
            ))}
          </ul>
        </section>
      ) : (
        <>
          <TriageBanner
            cards={triage}
            total={triageTotal}
            onFile={onTriageFile}
            onKeep={onTriageKeep}
            onAddToToday={onTriageToday}
          />

          {pinned.length > 0 && renderList(pinned, 'Pinned')}
          {renderList(rest, pinned.length > 0 ? 'All lists' : undefined)}
        </>
      )}
    </div>
  )
}
