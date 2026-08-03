export type MoveDirection = -1 | 1

/** Index of the neighbour a move would swap with, or -1 when there is none. */
function neighbourIndex(
  visible: string[],
  id: string,
  direction: MoveDirection,
): number {
  const from = visible.indexOf(id)
  if (from === -1) return -1
  const to = from + direction
  return to >= 0 && to < visible.length ? to : -1
}

export function canMoveInOrder(
  visible: string[],
  id: string,
  direction: MoveDirection,
): boolean {
  return neighbourIndex(visible, id, direction) !== -1
}

/**
 * Swap `id` with its neighbour in the rendered (`visible`) sequence, applied to
 * the stored (`full`) order. The two differ whenever a container hides rows —
 * a context list hides tasks that are planned into a day.
 */
export function moveInOrder(
  full: string[],
  visible: string[],
  id: string,
  direction: MoveDirection,
): string[] {
  const to = neighbourIndex(visible, id, direction)
  if (to === -1) return full

  const fromFull = full.indexOf(id)
  const toFull = full.indexOf(visible[to])
  if (fromFull === -1 || toFull === -1) return full

  const next = [...full]
  next[fromFull] = full[toFull]
  next[toFull] = full[fromFull]
  return next
}

/**
 * Drop `activeId` where `overId` sits, moving it only among the members of its
 * own group and leaving everything else exactly where it was.
 *
 * Mobile shows pinned lists in their own section, but the stored order is one
 * flat sequence shared with the desktop board. Reordering the visible sequence
 * and writing that back would drag every pinned list to the front of the board.
 * Instead the group's members are shuffled between the slots they already
 * occupy, so a drag on one screen never rearranges the other.
 */
export function moveWithinGroup(
  full: string[],
  group: string[],
  activeId: string,
  overId: string,
): string[] {
  if (activeId === overId) return full
  const inGroup = new Set(group)
  if (!inGroup.has(activeId) || !inGroup.has(overId)) return full

  const slots: number[] = []
  full.forEach((id, index) => {
    if (inGroup.has(id)) slots.push(index)
  })

  const members = slots.map((index) => full[index])
  const from = members.indexOf(activeId)
  const to = members.indexOf(overId)
  if (from === -1 || to === -1) return full

  members.splice(to, 0, ...members.splice(from, 1))

  const next = [...full]
  slots.forEach((slot, index) => {
    next[slot] = members[index]
  })
  return next
}
