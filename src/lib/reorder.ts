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
