import { useEffect, useRef } from 'react'

type Props = {
  cardId: string
  edge: 'left' | 'right'
  width?: number
  onResize: (cardId: string, width: number | null) => void
  minWidth?: number
  maxWidth?: number
}

export function WidthResizeHandle({
  cardId,
  edge,
  width,
  onResize,
  minWidth = 240,
  maxWidth = 520,
}: Props) {
  const startX = useRef(0)
  const startW = useRef(0)
  const active = useRef(false)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!active.current) return
      const delta = e.clientX - startX.current
      const signed = edge === 'right' ? delta : -delta
      const next = Math.max(minWidth, Math.min(maxWidth, startW.current + signed))
      onResize(cardId, next)
    }
    const onUp = () => {
      active.current = false
      document.body.classList.remove('is-resizing-x')
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [cardId, edge, maxWidth, minWidth, onResize])

  return (
    <div
      className={`width-handle width-handle--${edge}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize card ${edge}`}
      title="Drag to resize width · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        active.current = true
        startX.current = e.clientX
        const card = e.currentTarget.parentElement as HTMLElement | null
        startW.current = width ?? card?.offsetWidth ?? 300
        document.body.classList.add('is-resizing-x')
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onResize(cardId, null)
      }}
    />
  )
}
