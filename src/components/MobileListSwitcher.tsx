import { cardLabel } from '../lib/cardLabels'
import type { AppState } from '../lib/types'

type Props = {
  state: AppState
  cardIds: string[]
  activeCardId: string
  onActiveCardIdChange: (cardId: string) => void
}

/** Full-width list picker for the mobile-native single-list board. */
export function MobileListSwitcher({
  state,
  cardIds,
  activeCardId,
  onActiveCardIdChange,
}: Props) {
  const index = Math.max(0, cardIds.indexOf(activeCardId))
  const canPrev = index > 0
  const canNext = index < cardIds.length - 1

  return (
    <div className="list-switcher" role="navigation" aria-label="Lists">
      <button
        type="button"
        className="list-switcher__nav"
        disabled={!canPrev}
        aria-label="Previous list"
        onClick={() => {
          if (canPrev) onActiveCardIdChange(cardIds[index - 1])
        }}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
          <path
            d="M12.5 4.5 7 10l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <label className="list-switcher__select-wrap">
        <span className="sr-only">Current list</span>
        <select
          className="list-switcher__select"
          value={activeCardId}
          onChange={(e) => onActiveCardIdChange(e.target.value)}
        >
          {cardIds.map((id) => (
            <option key={id} value={id}>
              {cardLabel(state, id)}
            </option>
          ))}
        </select>
        <span className="list-switcher__chev" aria-hidden>
          ▾
        </span>
      </label>

      <button
        type="button"
        className="list-switcher__nav"
        disabled={!canNext}
        aria-label="Next list"
        onClick={() => {
          if (canNext) onActiveCardIdChange(cardIds[index + 1])
        }}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
          <path
            d="M7.5 4.5 13 10l-5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
