import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import type { Ref } from 'react'

type Props = {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorRef?: Ref<HTMLButtonElement>
}

/** Always-visible six-dot grip used to drag a whole list card. */
export function DragHandle({ attributes, listeners, setActivatorRef }: Props) {
  return (
    <button
      ref={setActivatorRef}
      type="button"
      className="card__drag"
      data-drag-handle
      title="Drag list"
      aria-label="Drag list"
      {...attributes}
      {...listeners}
    >
      <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden>
        <circle cx="3" cy="3" r="1.35" fill="currentColor" />
        <circle cx="7" cy="3" r="1.35" fill="currentColor" />
        <circle cx="3" cy="8" r="1.35" fill="currentColor" />
        <circle cx="7" cy="8" r="1.35" fill="currentColor" />
        <circle cx="3" cy="13" r="1.35" fill="currentColor" />
        <circle cx="7" cy="13" r="1.35" fill="currentColor" />
      </svg>
    </button>
  )
}
