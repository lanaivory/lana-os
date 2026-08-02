import type { CSSProperties } from 'react'
import type { TriageCard } from '../../lib/triage'

type Props = {
  cards: TriageCard[]
  total: number
  onFile: (taskId: string, listId: string) => void
  onKeep: (taskId: string) => void
  onAddToToday: (taskId: string) => void
}

/**
 * Only appears when capture could not place something. Each card shows the raw
 * text it could not read, the lists worth trying, and the one shortcut that
 * usually matters: also put it on Today.
 */
export function TriageBanner({
  cards,
  total,
  onFile,
  onKeep,
  onAddToToday,
}: Props) {
  if (cards.length === 0) return null

  return (
    <section className="mos-triage" aria-label="Tasks that need a home">
      <h2 className="mos-triage__title">
        {total} task{total === 1 ? '' : 's'} need{total === 1 ? 's' : ''} a home
      </h2>

      {cards.map(({ task, suggestions }) => (
        <article key={task.id} className="mos-triage__card">
          <p className="mos-triage__text">{task.text}</p>
          <div className="mos-chiprow">
            {suggestions.map((list) => (
              <button
                key={list.id}
                type="button"
                className="mos-listchip"
                style={{ '--tag': list.color } as CSSProperties}
                onClick={() => onFile(task.id, list.id)}
              >
                {list.name}
              </button>
            ))}
            <button
              type="button"
              className="mos-listchip mos-listchip--more"
              onClick={() => onKeep(task.id)}
            >
              Leave it
            </button>
          </div>
          <button
            type="button"
            className="mos-triage__today"
            onClick={() => onAddToToday(task.id)}
          >
            Also add to Today
          </button>
        </article>
      ))}

      {total > cards.length && (
        <p className="mos-note">{total - cards.length} more waiting.</p>
      )}
    </section>
  )
}
