import { formatMinutesUntil, type NowCard as NowCardValue } from '../../lib/nowCard'
import { displayTextWithoutUrl, extractUrl } from '../../lib/urls'
import { TimeBox } from './TimeBox'
import { CheckIcon, ShuffleIcon } from './icons'

type Props = {
  card: NowCardValue
  onComplete: (taskId: string) => void
  onOpen: (taskId: string) => void
  onShuffle: () => void
}

/**
 * The top of the Playlist, adapting to the clock: when something is timed and
 * close it takes over the card and offers one button. The rest of the time it
 * picks an untimed task for you, and you can re-roll it.
 *
 * The card hugs what it holds — a label, the title, and the one action beside
 * it. Done is the row checkbox writ large rather than a pill adrift in space
 * below the title, so the card is only as tall as its content.
 */
export function NowCard({ card, onComplete, onOpen, onShuffle }: Props) {
  if (!card) return null

  const timed = card.kind === 'timed'
  const url = extractUrl(card.task.text)
  const title = url ? displayTextWithoutUrl(card.task.text) || url : card.task.text

  return (
    <section className="mos-now" aria-label="Up next">
      <div className="mos-now__head">
        <span className="mos-now__label">
          {timed ? formatMinutesUntil(card.minutesUntil) : 'Suggested'}
        </span>
        {!timed && (
          <button
            type="button"
            className="mos-icon-btn"
            aria-label="Suggest another task"
            onClick={onShuffle}
          >
            <ShuffleIcon />
          </button>
        )}
      </div>

      <div className="mos-now__row">
        <button
          type="button"
          className="mos-now__task"
          onClick={() => onOpen(card.task.id)}
        >
          {timed && <TimeBox time={card.task.time} />}
          <span className="mos-now__title">{title}</span>
        </button>

        <button
          type="button"
          className="mos-now__done"
          aria-label={`Complete ${card.task.text}`}
          onClick={() => onComplete(card.task.id)}
        >
          <CheckIcon />
        </button>
      </div>
    </section>
  )
}
