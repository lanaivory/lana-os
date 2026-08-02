import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from 'react'
import { PLAYLIST_CARD_IDS } from '../lib/board'
import { PLAYLIST_META, type PlaylistId } from '../lib/types'

const AGENDA_PAGES = PLAYLIST_CARD_IDS

/** Cap for the scrollable pager body (chrome sits above). */
const AGENDA_PAGER_MAX_PX = 280

type Props = {
  activePlaylistId: PlaylistId
  onActivePlaylistChange: (id: PlaylistId) => void
  children: (playlistId: PlaylistId) => ReactNode
}

function indexOfPlaylist(id: PlaylistId): number {
  const idx = AGENDA_PAGES.indexOf(id)
  return idx >= 0 ? idx : 0
}

function agendaPagerCapPx(): number {
  if (typeof window === 'undefined') return AGENDA_PAGER_MAX_PX
  const dvh = window.innerHeight * 0.34
  return Math.max(120, Math.min(AGENDA_PAGER_MAX_PX, Math.round(dvh)))
}

/** Horizontally swipeable Today / Tomorrow / This Week pager for mobile. */
export function MobileAgenda({
  activePlaylistId,
  onActivePlaylistChange,
  children,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const settleTimer = useRef(0)
  const [pageIndex, setPageIndex] = useState(() =>
    indexOfPlaylist(activePlaylistId),
  )
  /** Height of the active page’s content, capped — avoids reserving empty 40dvh. */
  const [pagerHeight, setPagerHeight] = useState<number | null>(null)

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const el = scrollerRef.current
    if (!el) return
    const width = el.clientWidth
    if (width <= 0) return
    el.scrollTo({ left: index * width, behavior })
  }, [])

  // External navigation (capture / search / deep-link) → snap the pager.
  useEffect(() => {
    const next = indexOfPlaylist(activePlaylistId)
    setPageIndex(next)
    // Instant snap so highlight/scroll can find the task on that page.
    const frame = window.requestAnimationFrame(() => {
      scrollToIndex(next, 'auto')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activePlaylistId, scrollToIndex])

  // Keep page aligned after rotate / resize.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      scrollToIndex(indexOfPlaylist(activePlaylistId), 'auto')
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [activePlaylistId, scrollToIndex])

  const commitIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, AGENDA_PAGES.length - 1))
      setPageIndex(clamped)
      const id = AGENDA_PAGES[clamped]
      if (id && id !== activePlaylistId) onActivePlaylistChange(id)
    },
    [activePlaylistId, onActivePlaylistChange],
  )

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    const width = el.clientWidth
    if (width <= 0) return
    const next = Math.round(el.scrollLeft / width)
    if (next !== pageIndex) setPageIndex(next)
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      commitIndex(next)
    }, 80)
  }

  useEffect(() => {
    return () => window.clearTimeout(settleTimer.current)
  }, [])

  // Size the pager to the *active* page’s content (up to a cap) so empty
  // days never reserve a tall empty band above Lists.
  useLayoutEffect(() => {
    const pager = scrollerRef.current
    if (!pager) return
    const id = AGENDA_PAGES[pageIndex]
    if (!id) return
    const page = pager.querySelector<HTMLElement>(`[data-agenda-page="${id}"]`)
    if (!page) return

    const measure = () => {
      const cap = agendaPagerCapPx()
      // Prefer the card’s natural height; fall back to the page’s scrollHeight.
      const card = page.firstElementChild as HTMLElement | null
      const contentH = Math.ceil(
        card?.scrollHeight || page.scrollHeight || 0,
      )
      // Include page padding so the last row isn’t clipped.
      const styles = window.getComputedStyle(page)
      const pad =
        (parseFloat(styles.paddingTop) || 0) +
        (parseFloat(styles.paddingBottom) || 0)
      setPagerHeight(Math.min(Math.max(contentH + pad, 0), cap))
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(page)
    const card = page.firstElementChild
    if (card) ro?.observe(card)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [pageIndex])

  const pagerStyle = {
    ...(pagerHeight != null ? { height: pagerHeight } : null),
  } as CSSProperties

  return (
    <section className="mobile-agenda" aria-label="Agenda">
      <div className="mobile-agenda__chrome">
        <div
          className="mobile-agenda__segments"
          role="tablist"
          aria-label="Agenda day"
        >
          {AGENDA_PAGES.map((id, index) => {
            const selected = index === pageIndex
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`mobile-agenda__segment${selected ? ' is-active' : ''}`}
                onClick={() => {
                  commitIndex(index)
                  scrollToIndex(index, 'smooth')
                }}
              >
                {PLAYLIST_META[id].name}
              </button>
            )
          })}
        </div>
        <div className="mobile-agenda__dots" aria-hidden>
          {AGENDA_PAGES.map((id, index) => (
            <button
              key={id}
              type="button"
              className={`mobile-agenda__dot${index === pageIndex ? ' is-active' : ''}`}
              tabIndex={-1}
              onClick={() => {
                commitIndex(index)
                scrollToIndex(index, 'smooth')
              }}
            />
          ))}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mobile-agenda__pager"
        data-agenda-pager
        style={pagerStyle}
        onScroll={onScroll}
      >
        {AGENDA_PAGES.map((id) => (
          <div
            key={id}
            className="mobile-agenda__page"
            data-agenda-page={id}
            role="tabpanel"
            aria-label={PLAYLIST_META[id].name}
          >
            {children(id)}
          </div>
        ))}
      </div>
    </section>
  )
}
