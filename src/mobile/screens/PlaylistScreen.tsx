import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { commitmentsForDay } from '../../lib/commitments'
import { agendaTasks } from '../../lib/mobileSelectors'
import type { NowCard as NowCardValue } from '../../lib/nowCard'
import type { AppState, PlaylistId } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { CommitmentRow } from '../components/CommitmentRow'
import { CompletedSection } from '../components/CompletedSection'
import { DayTabs } from '../components/DayTabs'
import { NowCard } from '../components/NowCard'
import { PlusIcon } from '../components/icons'
import { TaskRow } from '../components/TaskRow'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'

type Props = {
  state: AppState
  day: PlaylistId
  liveDate: string
  todayKey: string
  nowCard: NowCardValue
  completedOpen: boolean
  onDayChange: (day: PlaylistId) => void
  onShuffle: () => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onToggleCommitment: (id: string) => void
  onOpenCommitment: (id: string) => void
  onToggleCompletedOpen: () => void
  onClearCompleted: (taskIds: string[]) => void
  onPlanFromLists: () => void
}

/**
 * The plan for a day: what to do next at the top, then the rest in the order
 * it will be worked, then what is already finished, folded away.
 */
export function PlaylistScreen({
  state,
  day,
  liveDate,
  todayKey,
  nowCard,
  completedOpen,
  onDayChange,
  onShuffle,
  onToggleTask,
  onOpenTask,
  onToggleCommitment,
  onOpenCommitment,
  onToggleCompletedOpen,
  onClearCompleted,
  onPlanFromLists,
}: Props) {
  const index = PLAYLIST_CARD_IDS.indexOf(day)
  const step = (delta: number) => {
    const next = PLAYLIST_CARD_IDS[index + delta]
    if (next) onDayChange(next)
  }
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
  })

  const tasks = agendaTasks(state, day)
  const open = tasks.filter((task) => !task.completed)
  const done = tasks.filter((task) => task.completed)
  const commitments = commitmentsForDay(state, day, todayKey)

  return (
    <div className="mos-scroll" {...swipe}>
      <DayTabs
        state={state}
        day={day}
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

        <p className="mos-day__caption">
          {day === 'today' ? liveDate : PLAYLIST_META[day].hint}
          {tasks.length > 0 && ` · ${done.length}/${tasks.length} done`}
        </p>

        {commitments.length > 0 && (
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
          </ul>
        )}

        {open.length === 0 && commitments.length === 0 ? (
          <p className="mos-empty">
            Nothing planned yet. Pull a few tasks over from your lists.
          </p>
        ) : (
          open.length > 0 && (
            <ul className="mos-tasks">
              {open.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  lists={state.lists}
                  onToggle={onToggleTask}
                  onOpen={onOpenTask}
                />
              ))}
            </ul>
          )
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
