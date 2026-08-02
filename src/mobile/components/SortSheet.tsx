import {
  LIST_SORT_LABELS,
  LIST_SORT_MODES,
  type ListSortMode,
} from '../../lib/listSort'
import { Sheet, SheetAction } from './Sheet'

const SORT_HINTS: Record<ListSortMode, string> = {
  custom: 'The order you arranged by hand',
  az: 'Alphabetical by task title',
  recent: 'Newest first, completed last',
}

type Props = {
  open: boolean
  sort: ListSortMode
  onClose: () => void
  onSelect: (sort: ListSortMode) => void
}

export function SortSheet({ open, sort, onClose, onSelect }: Props) {
  return (
    <Sheet open={open} title="Sort lists" onClose={onClose} layer="stacked">
      {LIST_SORT_MODES.map((mode) => (
        <SheetAction
          key={mode}
          label={`${LIST_SORT_LABELS[mode]}${mode === sort ? '  ✓' : ''}`}
          hint={SORT_HINTS[mode]}
          onClick={() => {
            onSelect(mode)
            onClose()
          }}
        />
      ))}
    </Sheet>
  )
}
