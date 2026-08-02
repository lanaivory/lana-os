import { useEffect, useState } from 'react'
import type { ContextList } from '../../lib/types'
import { Group, Row } from './Group'
import { Sheet } from './Sheet'

type Props = {
  list: ContextList | null
  taskCount: number
  onClose: () => void
  onRename: (listId: string, name: string) => void
  onTogglePin: (listId: string) => void
  onStartReorder: () => void
  onDelete: (listId: string) => void
}

export function ListSheet({
  list,
  taskCount,
  onClose,
  onRename,
  onTogglePin,
  onStartReorder,
  onDelete,
}: Props) {
  const [name, setName] = useState(list?.name ?? '')

  useEffect(() => {
    setName(list?.name ?? '')
  }, [list?.id, list?.name])

  if (!list) return null

  const commitName = () => {
    const next = name.trim()
    if (next && next !== list.name) onRename(list.id, next)
    else setName(list.name)
  }

  return (
    <Sheet open title="List" onClose={onClose}>
      <form
        className="mos-sheet__title-form"
        onSubmit={(event) => {
          event.preventDefault()
          commitName()
        }}
      >
        <input
          className="mos-sheet__title-input"
          value={name}
          aria-label="List name"
          enterKeyHint="done"
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
        />
      </form>

      <Group>
        <Row
          label={list.pinned ? 'Unpin list' : 'Pin list'}
          hint="Pinned lists sit in their own section on top"
          onClick={() => onTogglePin(list.id)}
        />
        <Row label="Reorder lists" onClick={onStartReorder} />
        <Row
          label="Delete list"
          hint={
            taskCount === 0
              ? 'Recoverable for 24 hours'
              : `Also removes ${taskCount} task${taskCount === 1 ? '' : 's'}`
          }
          tone="danger"
          onClick={() => onDelete(list.id)}
        />
      </Group>
    </Sheet>
  )
}
