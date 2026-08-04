import { Row } from './Group'
import { Sheet } from './Sheet'

type Props = {
  open: boolean
  byTime: boolean
  onClose: () => void
  onSelect: (byTime: boolean) => void
}

/** The two orders a day's queue can be in. */
export function QueueSortSheet({ open, byTime, onClose, onSelect }: Props) {
  return (
    <Sheet open={open} title="Sort the queue" onClose={onClose}>
      <Row
        label="By time"
        hint="Earliest first, untimed after, completed last"
        selected={byTime}
        onClick={() => {
          onSelect(true)
          onClose()
        }}
      />
      <Row
        label="Custom"
        hint="The order you arranged by hand — hold a row to drag it"
        selected={!byTime}
        onClick={() => {
          onSelect(false)
          onClose()
        }}
      />
    </Sheet>
  )
}
