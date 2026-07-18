import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { CaptureFlash } from '../hooks/useLanaStore'
import type { ContextList } from '../lib/types'

type Props = {
  lists: ContextList[]
  flashes: CaptureFlash[]
  onCapture: (raw: string) => void
  openSignal: number
}

export function CaptureBar({ lists, flashes, onCapture, openSignal }: Props) {
  const [value, setValue] = useState('')
  const [pulse, setPulse] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (openSignal === 0) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [openSignal])

  useEffect(() => {
    if (flashes.length === 0) return
    setPulse(true)
    const t = window.setTimeout(() => setPulse(false), 700)
    return () => window.clearTimeout(t)
  }, [flashes])

  const submit = () => {
    const raw = value.trim()
    if (!raw) return
    onCapture(raw)
    setValue('')
  }

  return (
    <section className={`capture ${pulse ? 'is-pulse' : ''}`}>
      <div className="capture__shell">
        <div className="capture__label">
          <span className="capture__brand">Lana OS</span>
          <kbd className="capture__kbd">⌘K</kbd>
        </div>
        <textarea
          ref={inputRef}
          className="capture__input"
          rows={1}
          placeholder="Capture a thought… paste bullets, links, or a whole brain dump"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          aria-label="Quick capture"
        />
        <button
          type="button"
          className="capture__go"
          onClick={submit}
          disabled={!value.trim()}
        >
          Capture
        </button>
      </div>

      {flashes.length > 0 && (
        <ul className="capture__flash" aria-live="polite">
          {flashes.map((f) => {
            const list = lists.find((l) => l.id === f.listId)
            return (
              <li key={f.id}>
                <span className="capture__flash-text">{f.text}</span>
                <span
                  className="capture__flash-tag"
                  style={{ '--tag': list?.color ?? '#8b919a' } as CSSProperties}
                >
                  {list?.name ?? 'Inbox'}
                  {f.playlistId ? ` · ${labelPlaylist(f.playlistId)}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function labelPlaylist(id: string): string {
  if (id === 'today') return 'Today'
  if (id === 'tomorrow') return 'Tomorrow'
  return 'This Week'
}
