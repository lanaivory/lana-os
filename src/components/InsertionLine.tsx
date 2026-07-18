export type InsertionState =
  | {
      kind: 'task'
      containerId: string
      index: number
    }
  | {
      kind: 'card'
      column: number
      index: number
    }
  | {
      kind: 'column'
      index: number
    }
  | null

type Props = {
  orientation?: 'horizontal' | 'vertical'
}

export function InsertionLine({ orientation = 'horizontal' }: Props) {
  return (
    <div
      className={`insert-line insert-line--${orientation}`}
      aria-hidden
    />
  )
}
