import { useEffect, useState } from 'react'
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
import { commitmentsForDay } from '../../lib/commitments'
import { agendaTasks } from '../../lib/mobileSelectors'
import type { NowCard as NowCardValue } from '../../lib/nowCard'
import type { AppState, ContextList, PlaylistId, Task } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { CommitmentRow } from '../components/CommitmentRow'
import { CompletedSection } from '../components/CompletedSection'
import { DayTabs } from '../components/DayTabs'
import { NowCard } from '../components/NowCard'
import { ChevronIcon, PlusIcon } from '../components/icons'
import { TaskRow, type TaskRowActions } from '../components/TaskRow'

type Props = {
  state: AppState
  day: PlaylistId
  todayKey: string
  nowCard: NowCardValue
  completedOpen: boolean
  onDayChange: (day: PlaylistId) => void
  onShuffle: () => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onMoveTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onTimeChange: (taskId: string, time: string | null) => void
  onToggleCommitment: (id: string) => void
  onOpenCommitment: (id: string) => void
  onToggleCompletedOpen: () => void
  onClearCompleted: (taskIds: string[]) => void
  onOpenSort: () => void
  /** Drops `activeId` where `overId` sits among the day's visible open tasks. */
  onReorder: (visibleIds: string[], activeId: string, overId: string) => void
  onPlanFromLists: () => void
}

/** A queue row that can be picked up and dragged into a new order. */
function SortableTaskRow({
  task,
  lists,
  actions,
  onToggle,
  onOpen,
  onTimeChange,
}: {
  task: Task
  lists: ContextList[]
  actions: TaskRowActions
  onToggle: (taskId: string) => void
  onOpen: (taskId: string) => void
  onTimeChange: (taskId: string, time: string | null) => void
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  return (
    <TaskRow
      task={task}
      lists={lists}
      alwaysShowTime
      actions={actions}
      sortable={{ listeners, setNodeRef, transform, transition, isDragging }}
      onToggle={onToggle}
      onOpen={onOpen}
      onTimeChange={onTimeChange}
    />
  )
}

/**
 * The plan for a day: what to do next at the top, then the rest in the order it
 * will be worked, then what is already finished, folded away.
 *
 * The day is changed from the strip at the top, never by swiping the queue —
 * down here left and right belong to the rows, which swipe to complete or to
 * uncover Move and Delete.
 */
export function PlaylistScreen({
  state,
  day,
  todayKey,
  nowCard,
  completedOpen,
  onDayChange,
  onShuffle,
  onToggleTask,
  onOpenTask,
  onMoveTask,
  onDeleteTask,
  onTimeChange,
  onToggleCommitment,
  onOpenCommitment,
  onToggleCompletedOpen,
  onClearCompleted,
  onOpenSort,
  onReorder,
  onPlanFromLists,
}: Props) {
  const [swipedId, setSwipedId] = useState<string | null>(null)
  // A row left open belongs to the day it was opened on.
  useEffect(() => setSwipedId(null), [day])

  const tasks = agendaTasks(state, day)
  // Whatever the Now card is holding is not repeated in the queue beneath it.
  const promotedId = day === 'today' ? (nowCard?.task.id ?? null) : null
  const open = tasks.filter(
    (task) => !task.completed && task.id !== promotedId,
  )
  const done = tasks.filter((task) => task.completed)
  const commitments = commitmentsForDay(state, day, todayKey)

  const actions: TaskRowActions = {
    onComplete: onToggleTask,
    onMove: (taskId) => {
      setSwipedId(null)
      onMoveTask(taskId)
    },
    onDelete: (taskId) => {
      setSwipedId(null)
      onDeleteTask(taskId)
    },
    openId: swipedId,
    onOpenChange: setSwipedId,
  }

  // Only the hand-arranged order is yours to rearrange; by time, the clock owns it.
  const canReorder = !state.sortTodayByTime
  // Touch: hold before a drag begins, so a flick still swipes the row.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 320, tolerance: 8 },
    }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onReorder(
      open.map((task) => task.id),
      String(active.id),
      String(over.id),
    )
  }

  // The header already carries today's date, so the caption only adds progress.
  const total = tasks.length + commitments.length
  const finished = done.length + commitments.filter((c) => c.done).length
  const caption = [
    day === 'today' ? '' : PLAYLIST_META[day].hint,
    total > 0 ? `${finished}/${total} done` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const rows = open.map((task) =>
    canReorder ? (
      <SortableTaskRow
        key={task.id}
        task={task}
        lists={state.lists}
        actions={actions}
        onToggle={onToggleTask}
        onOpen={onOpenTask}
        onTimeChange={onTimeChange}
      />
    ) : (
      <TaskRow
        key={task.id}
        task={task}
        lists={state.lists}
        alwaysShowTime
        actions={actions}
        onToggle={onToggleTask}
        onOpen={onOpenTask}
        onTimeChange={onTimeChange}
      />
    ),
  )

  /* Commitments and tasks share one run of lines: a day reads as one queue. */
  const queue = (
    <ul className="mos-tasks">
      {commitments.map((commitment) => (
        <CommitmentRow
          key={commitment.id}
          commitment={commitment}
          lists={state.lists}
          todayKey={todayKey}
          showDate={day !== 'today'}
          onToggle={onToggleCommitment}
          onOpen={onOpenCommitment}
        />
      ))}
      {canReorder ? (
        <SortableContext
          items={open.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {rows}
        </SortableContext>
      ) : (
        rows
      )}
    </ul>
  )

  return (
    <div className="mos-scroll">
      <DayTabs
        state={state}
        day={day}
        todayKey={todayKey}
        label="Planning day"
        onChange={onDayChange}
      />

      <section className="mos-day" key={day} aria-label={PLAYLIST_META[day].name}>
        {day === 'today' && (
          <NowCard
            card={nowCard}
            onComplete={onToggleTask}
            onOpen={onOpenTask}
            onShuffle={onShuffle}
          />
        )}

        <div className="mos-day__bar">
          {caption && <p className="mos-day__caption">{caption}</p>}
          <button
            type="button"
            className="mos-chip mos-chip--sort"
            aria-label={`Sort the queue, currently ${canReorder ? 'Custom' : 'By time'}`}
            onClick={onOpenSort}
          >
            Sort · {canReorder ? 'Custom' : 'By time'}
            <ChevronIcon open />
          </button>
        </div>

        {open.length === 0 && commitments.length === 0 && !promotedId ? (
          <p className="mos-empty">
            Nothing planned for {PLAYLIST_META[day].name.toLowerCase()} yet.
          </p>
        ) : (
          (commitments.length > 0 || open.length > 0) &&
          /* DndContext plants a live region, so it stays outside the list. */
          (canReorder ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              {queue}
            </DndContext>
          ) : (
            queue
          ))
        )}

        <CompletedSection
          tasks={done}
          lists={state.lists}
          open={completedOpen}
          onToggleOpen={onToggleCompletedOpen}
          onClear={() => onClearCompleted(done.map((task) => task.id))}
          onToggleTask={onToggleTask}
          onOpenTask={onOpenTask}
        />

        <button type="button" className="mos-ghost-btn" onClick={onPlanFromLists}>
          <PlusIcon />
          Add from lists
        </button>
      </section>
    </div>
  )
}
