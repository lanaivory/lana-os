import { useState, type CSSProperties } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  MobileListOverview,
  MobileSearchHit,
} from '../../lib/mobileSelectors'
import type { TriageCard } from '../../lib/triage'
import type { ContextList, Task } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { TaskRow } from '../components/TaskRow'
import { TriageBanner } from '../components/TriageBanner'
import { ChevronIcon, PinIcon, SearchIcon } from '../components/icons'
import { usePinGesture } from '../hooks/usePinGesture'

/** How many bullets an inline peek shows before it says how many are left. */
const PEEK_LIMIT = 6

type Props = {
  overviews: MobileListOverview[]
  lists: ContextList[]
  query: string
  results: MobileSearchHit[]
  triage: TriageCard[]
  triageTotal: number
  /** Unplanned tasks of a list, for the inline peek. */
  tasksForList: (listId: string) => Task[]
  onQueryChange: (query: string) => void
  onOpenList: (listId: string) => void
  onReorder: (group: string[], activeId: string, overId: string) => void
  onTogglePin: (listId: string) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onTriageFile: (taskId: string, listId: string) => void
  onTriageKeep: (taskId: string) => void
  onTriageToday: (taskId: string) => void
}

function ListIndexRow({
  overview,
  expanded,
  tasks,
  onToggleExpanded,
  onOpen,
  onTogglePin,
  onOpenTask,
}: {
  overview: MobileListOverview
  expanded: boolean
  tasks: Task[]
  onToggleExpanded: () => void
  onOpen: () => void
  onTogglePin: () => void
  onOpenTask: (taskId: string) => void
}) {
  const { handlers, consumedTap } = usePinGesture(onTogglePin)
  const { list } = overview
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id })

  const style = {
    '--tag': list.color,
    transform: CSS.Translate.toString(transform),
    transition,
  } as CSSProperties

  const peek = tasks.slice(0, PEEK_LIMIT)

  return (
    <li
      ref={setNodeRef}
      className={`mos-index__item${isDragging ? ' is-dragging' : ''}${
        expanded ? ' is-open' : ''
      }`}
      style={style}
      {...listeners}
    >
      <div className="mos-index__head">
        <button
          type="button"
          className="mos-index__open"
          aria-expanded={expanded}
          {...handlers}
          onClick={() => {
            if (consumedTap()) return
            onToggleExpanded()
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
          <ChevronIcon open={expanded} />
        </button>

        {/* Always present: a pin you cannot see is a pin nobody finds. */}
        <button
          type="button"
          className={`mos-index__pin${list.pinned ? '' : ' is-off'}`}
          aria-pressed={list.pinned}
          aria-label={`${list.pinned ? 'Unpin' : 'Pin'} ${list.name}`}
          onClick={onTogglePin}
        >
          <PinIcon filled={list.pinned} />
        </button>
      </div>

      {expanded && (
        <div className="mos-peek">
          {peek.length === 0 ? (
            <p className="mos-peek__empty">Nothing here yet.</p>
          ) : (
            <ul className="mos-peek__list">
              {peek.map((task) => (
                <li key={task.id} className="mos-peek__item">
                  <button
                    type="button"
                    className={`mos-peek__task${task.completed ? ' is-done' : ''}`}
                    onClick={() => onOpenTask(task.id)}
                  >
                    <span className="mos-peek__bullet" aria-hidden />
                    <span className="mos-peek__title">{task.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="mos-peek__open" onClick={onOpen}>
            {tasks.length > peek.length
              ? `Open ${list.name} · ${tasks.length - peek.length} more`
              : `Open ${list.name}`}
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * Index of every context list, pinned ones first. A tap opens the list where
 * it stands; the full page is a step further in, for when you want to work in
 * one. Hold a row to drag it into a new order — within its own section, since
 * the stored order is shared with the desktop board.
 */
export function ListsScreen({
  overviews,
  lists,
  query,
  results,
  triage,
  triageTotal,
  tasksForList,
  onQueryChange,
  onOpenList,
  onReorder,
  onTogglePin,
  onToggleTask,
  onOpenTask,
  onTriageFile,
  onTriageKeep,
  onTriageToday,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const searching = query.trim().length > 0
  const pinned = overviews.filter((o) => o.list.pinned)
  const rest = overviews.filter((o) => !o.list.pinned)

  // Touch: hold before a drag begins, so a flick still scrolls the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 320, tolerance: 8 },
    }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const dragged = overviews.find((o) => o.list.id === active.id)
    if (!dragged) return
    const group = overviews
      .filter((o) => o.list.pinned === dragged.list.pinned)
      .map((o) => o.list.id)
    onReorder(group, String(active.id), String(over.id))
  }

  const renderGroup = (group: MobileListOverview[], label?: string) => (
    <section className="mos-group" aria-label={label ?? 'Lists'}>
      {label && <h2 className="mos-group__title">{label}</h2>}
      <SortableContext
        items={group.map((o) => o.list.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="mos-index">
          {group.map((overview) => (
            <ListIndexRow
              key={overview.list.id}
              overview={overview}
              expanded={expandedId === overview.list.id}
              tasks={
                expandedId === overview.list.id
                  ? tasksForList(overview.list.id)
                  : []
              }
              onToggleExpanded={() =>
                setExpandedId((current) =>
                  current === overview.list.id ? null : overview.list.id,
                )
              }
              onOpen={() => onOpenList(overview.list.id)}
              onTogglePin={() => onTogglePin(overview.list.id)}
              onOpenTask={onOpenTask}
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  )

  return (
    <div className="mos-scroll">
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            {pinned.length > 0 && renderGroup(pinned, 'Pinned')}
            {renderGroup(rest, pinned.length > 0 ? 'All lists' : undefined)}
          </DndContext>
        </>
      )}
    </div>
  )
}
