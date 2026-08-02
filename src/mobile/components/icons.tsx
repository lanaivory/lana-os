const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
      <path d="M3.5 8.4l3 3 6-6.6" {...STROKE} strokeWidth="2" />
    </svg>
  )
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden
      className={`mos-chevron${open ? ' is-open' : ''}`}
    >
      <path d="M6 3.5L10.5 8 6 12.5" {...STROKE} strokeWidth="1.8" />
    </svg>
  )
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden>
      <path
        d="M7.2 11.4a3.4 3.4 0 0 1 0-4.8l1.8-1.8a3.4 3.4 0 1 1 4.8 4.8l-1 1"
        {...STROKE}
        strokeWidth="1.8"
      />
      <path
        d="M12.8 8.6a3.4 3.4 0 0 1 0 4.8l-1.8 1.8a3.4 3.4 0 1 1-4.8-4.8l1-1"
        {...STROKE}
        strokeWidth="1.8"
      />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
      <circle cx="8.5" cy="8.5" r="5.5" {...STROKE} strokeWidth="1.6" />
      <path d="M13 13l4 4" {...STROKE} strokeWidth="1.6" />
    </svg>
  )
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
      <circle cx="4.5" cy="10" r="1.6" fill="currentColor" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden>
      <path d="M12.5 4.5L7 10l5.5 5.5" {...STROKE} strokeWidth="1.8" />
      <path d="M7.2 10H16" {...STROKE} strokeWidth="1.8" />
    </svg>
  )
}

export function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
      <path
        d={direction === 'up' ? 'M8 12.5V4M4 7.5L8 3.5l4 4' : 'M8 3.5V12M4 8.5l4 4 4-4'}
        {...STROKE}
        strokeWidth="1.7"
      />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M8 3.2v9.6M3.2 8h9.6" {...STROKE} strokeWidth="1.8" />
    </svg>
  )
}
