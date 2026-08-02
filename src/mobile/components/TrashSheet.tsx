import { useEffect, useState } from 'react'
import { formatTrashTimeRemaining, trashEntryKey } from '../../lib/trash'
import type { TrashEntry } from '../../lib/types'
import { ConfirmSheet } from './ConfirmSheet'
import { Sheet } from './Sheet'

type Props = {
  open: boolean
  trash: TrashEntry[]
  onClose: () => void
  onRestore: (entry: TrashEntry) => void
  onDeletePermanently: (entry: TrashEntry) => void
}

function entryTitle(entry: TrashEntry): string {
  return entry.kind === 'task' ? entry.task.text : entry.list.name
}

export function TrashSheet({
  open,
  trash,
  onClose,
  onRestore,
  onDeletePermanently,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [pending, setPending] = useState<TrashEntry | null>(null)

  useEffect(() => {
    if (!open) {
      setPending(null)
      return
    }
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [open])

  return (
    <>
      <Sheet open={open} title="Recently deleted" onClose={onClose}>
        <p className="mos-sheet__note">
          Items stay here for 24 hours, then go for good.
        </p>

        {trash.length === 0 ? (
          <p className="mos-sheet__message">Nothing to recover.</p>
        ) : (
          <ul className="mos-trash">
            {trash.map((entry) => (
              <li key={trashEntryKey(entry)} className="mos-trash__item">
                <div className="mos-trash__main">
                  <span className="mos-trash__kind">
                    {entry.kind === 'list' ? 'List' : 'Task'}
                  </span>
                  <p className="mos-trash__title">{entryTitle(entry)}</p>
                  <p className="mos-trash__meta">
                    {entry.kind === 'list'
                      ? `${entry.tasks.length} task${entry.tasks.length === 1 ? '' : 's'} · `
                      : ''}
                    {formatTrashTimeRemaining(entry, now)}
                  </p>
                </div>
                <div className="mos-trash__actions">
                  <button
                    type="button"
                    className="mos-btn mos-btn--accent"
                    onClick={() => onRestore(entry)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="mos-btn mos-btn--danger"
                    onClick={() => setPending(entry)}
                  >
                    Delete now
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <ConfirmSheet
        open={pending !== null}
        title="Delete permanently?"
        message={
          pending
            ? `“${entryTitle(pending)}” cannot be recovered after this.`
            : ''
        }
        confirmLabel="Delete permanently"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) onDeletePermanently(pending)
          setPending(null)
        }}
      />
    </>
  )
}
