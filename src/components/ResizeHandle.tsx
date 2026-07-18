import { useEffect, useRef } from 'react'

type Props = {
  cardId: string
  height?: number
  onResize: (cardId: string, height: number | null) => void
  minHeight?: number
  maxHeight?: number
}

export function ResizeHandle({
  cardId,
  height,
  onResize,
  minHeight = 120,
  maxHeight = 720,
}: Props) {
  const startY = useRef(0)
  const startH = useRef(0)
  const active = useRef(false)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!active.current) return
      const delta = e.clientY - startY.current
      const next = Math.max(
        minHeight,
        Math.min(maxHeight, startH.current + delta),
      )
      onResize(cardId, next)
    }
    const onUp = () => {
      active.current = false
      document.body.classList.remove('is-resizing')
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [cardId, maxHeight, minHeight, onResize])

  return (
    <div
      className="resize-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize card"
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        active.current = true
        startY.current = e.clientY
        const card = (e.currentTarget.parentElement as HTMLElement | null)
        startH.current =
          height ?? card?.querySelector('.card__scroll')?.clientHeight ?? 200
        document.body.classList.add('is-resizing')
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onResize(cardId, null)
      }}
    />
  )
}
