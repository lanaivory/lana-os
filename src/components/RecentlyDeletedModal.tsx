import { useEffect, useState } from 'react'
import {
  formatTrashTimeRemaining,
  trashEntryKey,
} from '../lib/trash'
import type { TrashEntry } from '../lib/types'

type Props = {
  open: boolean
  trash: TrashEntry[]
  onClose: () => void
  onRestore: (entry: TrashEntry) => void
  onDeletePermanently: (entry: TrashEntry) => void
}

export function RecentlyDeletedModal({
  open,
  trash,
  onClose,
  onRestore,
  onDeletePermanently,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [pendingHardDelete, setPendingHardDelete] = useState<TrashEntry | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open) setPendingHardDelete(null)
  }, [open])

  if (!open) return null

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Recently Deleted"
    >
      <button
        type="button"
        className="modal__backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="modal__panel modal__panel--trash">
        <header className="modal__head">
          <h2>Recently Deleted</h2>
          <button type="button" className="ghost" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal__body">
          <p className="modal__hint trash-hint">
            Items stay here for 24 hours, then are permanently removed.
          </p>

          {trash.length === 0 ? (
            <p className="trash-empty">Nothing in the recovery bin.</p>
          ) : (
            <ul className="trash-list">
              {trash.map((entry) => (
                <li key={trashEntryKey(entry)} className="trash-item">
                  <div className="trash-item__main">
                    <span className="trash-item__kind">
                      {entry.kind === 'list' ? 'List' : 'Task'}
                    </span>
                    <p className="trash-item__title">
                      {entry.kind === 'task'
                        ? entry.task.text
                        : entry.list.name}
                    </p>
                    <p className="trash-item__meta">
                      {entry.kind === 'list'
                        ? `${entry.tasks.length} task${entry.tasks.length === 1 ? '' : 's'} · `
                        : ''}
                      {formatTrashTimeRemaining(entry, now)}
                    </p>
                  </div>
                  <div className="trash-item__actions">
                    <button
                      type="button"
                      className="topbar__btn topbar__btn--accent"
                      onClick={() => onRestore(entry)}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="topbar__btn topbar__btn--danger"
                      onClick={() => setPendingHardDelete(entry)}
                    >
                      Delete permanently now
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {pendingHardDelete && (
        <div
          className="modal modal--nested"
          role="dialog"
          aria-modal="true"
          aria-label="Delete permanently"
        >
          <button
            type="button"
            className="modal__backdrop"
            onClick={() => setPendingHardDelete(null)}
            aria-label="Close"
          />
          <div className="modal__panel modal__panel--confirm">
            <header className="modal__head">
              <h2>Delete permanently?</h2>
              <button
                type="button"
                className="ghost"
                onClick={() => setPendingHardDelete(null)}
              >
                ✕
              </button>
            </header>
            <div className="modal__body">
              <p>
                {pendingHardDelete.kind === 'list'
                  ? `Permanently delete “${pendingHardDelete.list.name}” and its ${pendingHardDelete.tasks.length} task${pendingHardDelete.tasks.length === 1 ? '' : 's'}? This cannot be undone.`
                  : `Permanently delete “${pendingHardDelete.task.text}”? This cannot be undone.`}
              </p>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="topbar__btn"
                  onClick={() => setPendingHardDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="topbar__btn topbar__btn--danger"
                  onClick={() => {
                    onDeletePermanently(pendingHardDelete)
                    setPendingHardDelete(null)
                  }}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
