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

export function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
      <path d="M12 4.5L6.5 10l5.5 5.5" {...STROKE} strokeWidth="1.9" />
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

export function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" {...STROKE} strokeWidth="1.8" />
    </svg>
  )
}

export function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path d="M7 6h.01M13 6h.01M7 10h.01M13 10h.01M7 14h.01M13 14h.01" {...STROKE} strokeWidth="2.4" />
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

export function PinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path
        d="M12.4 2.6l5 5-2.1.6-3.3 3.3-.4 3.3-4.4-4.4L3 15.6l1.2-4.6 4.2-4.2.6-3.6z"
        {...STROKE}
        strokeWidth="1.6"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

export function ShuffleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden>
      <path d="M3 5.5h3l7 9h4M3 14.5h3l2.2-2.8M11.6 7.4L13 5.5h4" {...STROKE} strokeWidth="1.7" />
      <path d="M15 3.4l2.2 2.1L15 7.6M15 12.4l2.2 2.1L15 16.6" {...STROKE} strokeWidth="1.7" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden>
      <path
        d="M5.5 8.2a4.5 4.5 0 0 1 9 0c0 3 .9 4.3 1.4 4.8H4.1c.5-.5 1.4-1.8 1.4-4.8z"
        {...STROKE}
        strokeWidth="1.5"
      />
      <path d="M8.4 15.4a1.8 1.8 0 0 0 3.2 0" {...STROKE} strokeWidth="1.5" />
    </svg>
  )
}

/* ------------------------------------------------------------- tab icons */

export function PlaylistTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 7h9M4 12h9M4 17h6" {...STROKE} strokeWidth="1.9" />
      <path d="M17 10.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ListsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...STROKE} strokeWidth="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" {...STROKE} strokeWidth="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...STROKE} strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" {...STROKE} strokeWidth="1.8" />
    </svg>
  )
}

export function CalendarTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" {...STROKE} strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3.5V6M16 3.5V6" {...STROKE} strokeWidth="1.8" />
      <circle cx="8.5" cy="14" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function SettingsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 7.5h10M18 7.5h2M4 16.5h4M12 16.5h8" {...STROKE} strokeWidth="1.9" />
      <circle cx="16" cy="7.5" r="2.4" {...STROKE} strokeWidth="1.8" />
      <circle cx="10" cy="16.5" r="2.4" {...STROKE} strokeWidth="1.8" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
      <circle cx="10" cy="10" r="6.8" {...STROKE} strokeWidth="1.6" />
      <path d="M10 6.2V10l2.6 1.6" {...STROKE} strokeWidth="1.6" />
    </svg>
  )
}
