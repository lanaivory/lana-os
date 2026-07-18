import { useEffect, useRef } from 'react'

type Props = {
  query: string
  onQueryChange: (value: string) => void
  searchFocusSignal: number
  canUndo: boolean
  onUndo: () => void
  onClearCompleted: () => void
  onNewList: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onOpenSettings: () => void
  textCaptureConnected?: boolean
}

export function HeaderBar({
  query,
  onQueryChange,
  searchFocusSignal,
  canUndo,
  onUndo,
  onClearCompleted,
  onNewList,
  theme,
  onToggleTheme,
  onOpenSettings,
  textCaptureConnected = false,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchFocusSignal === 0) return
    searchRef.current?.focus()
    searchRef.current?.select()
  }, [searchFocusSignal])

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <h1 className="topbar__title">Lana OS</h1>
        {textCaptureConnected && (
          <span className="topbar__textcap" title="Polling Twilio inbox">
            <span className="topbar__textcap-dot" aria-hidden />
            Text capture connected
          </span>
        )}
      </div>

      <div className="topbar__actions">
        <label className="topbar__find">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M13 13l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <input
            id="lana-search"
            ref={searchRef}
            type="search"
            placeholder="Find"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <kbd>⌘K</kbd>
        </label>

        <button
          type="button"
          className="topbar__btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          Undo
        </button>

        <button
          type="button"
          className="topbar__btn"
          onClick={onClearCompleted}
          title="Clear completed tasks"
        >
          Clear Completed
        </button>

        <button
          type="button"
          className="topbar__btn topbar__btn--accent"
          onClick={onNewList}
        >
          + New List
        </button>

        <button
          type="button"
          className="topbar__icon"
          onClick={onToggleTheme}
          aria-label={
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          }
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
              <circle cx="10" cy="10" r="3.4" fill="currentColor" />
              <path
                d="M10 2v2.2M10 15.8V18M2 10h2.2M15.8 10H18M4.4 4.4l1.5 1.5M14.1 14.1l1.5 1.5M15.6 4.4l-1.5 1.5M5.9 14.1l-1.5 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
              <path
                d="M12.8 3.2A6.8 6.8 0 1 0 16.8 12a5.4 5.4 0 0 1-4-8.8z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="topbar__icon"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
            <path
              d="M8.2 2.5h3.6l.4 1.7a5.8 5.8 0 0 1 1.4.8l1.6-.7 1.8 1.8-.7 1.6c.3.45.6.92.8 1.4l1.7.4v3.6l-1.7.4a5.8 5.8 0 0 1-.8 1.4l.7 1.6-1.8 1.8-1.6-.7a5.8 5.8 0 0 1-1.4.8l-.4 1.7H8.2l-.4-1.7a5.8 5.8 0 0 1-1.4-.8l-1.6.7-1.8-1.8.7-1.6a5.8 5.8 0 0 1-.8-1.4l-1.7-.4V8.2l1.7-.4c.2-.48.48-.95.8-1.4l-.7-1.6L5.2 3.6l1.6.7c.45-.3.92-.58 1.4-.8l.4-1.7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <circle
              cx="10"
              cy="10"
              r="2.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
