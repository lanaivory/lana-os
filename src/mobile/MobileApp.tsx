import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LanaStore } from '../hooks/useLanaStore'
import { useTwilioInbox } from '../hooks/useTwilioInbox'
import { findPlaylistContaining, orderedListTasks } from '../lib/board'
import { clearFocusFromUrl, readFocusTaskId } from '../lib/focusTask'
import { isListCollapsed, withListCollapsed } from '../lib/mobilePrefs'
import {
  agendaTasks,
  listSection,
  listSections,
  mobileListOrder,
  taskLocation,
} from '../lib/mobileSelectors'
import { canMoveInOrder, moveInOrder, type MoveDirection } from '../lib/reorder'
import type { PlaylistId } from '../lib/types'
import { AgendaSection } from './components/AgendaSection'
import { CaptureBar } from './components/CaptureBar'
import { ConfirmSheet } from './components/ConfirmSheet'
import { ListSheet } from './components/ListSheet'
import { ListsPane } from './components/ListsPane'
import { MenuSheet } from './components/MenuSheet'
import { MobileHeader } from './components/MobileHeader'
import { PromptSheet } from './components/PromptSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { TaskSheet } from './components/TaskSheet'
import { TrashSheet } from './components/TrashSheet'
import { useKeyboardInset } from './hooks/useKeyboardInset'
import { useMobilePrefs } from './hooks/useMobilePrefs'
import { revealTaskInContainer } from './revealTask'
import './mobile.css'

type PendingDelete =
  | { kind: 'task'; id: string; label: string }
  | { kind: 'list'; id: string; label: string; taskCount: number }

const CLOCK_TICK_MS = 30_000
/** How long a push deep-link waits for the SMS webhook's task to sync in. */
const FOCUS_ATTEMPTS = 10
const FOCUS_INTERVAL_MS = 500

export function MobileApp({ store }: { store: LanaStore }) {
  const state = store.state
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  useKeyboardInset(rootRef)

  const stateRef = useRef(state)
  stateRef.current = state
  const getState = useCallback(() => stateRef.current, [])
  const {
    connected: textCaptureConnected,
    checking: textCaptureChecking,
    checkNow,
  } = useTwilioInbox(store.capture, getState)

  const [prefs, updatePrefs] = useMobilePrefs()
  const [query, setQuery] = useState('')
  const [reordering, setReordering] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [openListId, setOpenListId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [newListOpen, setNewListOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [revealTaskId, setRevealTaskId] = useState<string | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(readFocusTaskId)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const liveClock = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(now),
    [now],
  )
  const liveDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now),
    [now],
  )

  const sections = useMemo(
    () => listSections(state, { query, sort: prefs.listSort }),
    [state, query, prefs.listSort],
  )

  const listIsEmpty = useCallback(
    (listId: string) =>
      (sections.find((s) => s.list.id === listId)?.total ?? 0) === 0,
    [sections],
  )

  const collapsedFor = useCallback(
    (listId: string) =>
      isListCollapsed(prefs, listId, { isEmpty: listIsEmpty(listId) }),
    [prefs, listIsEmpty],
  )

  const setAgendaDay = useCallback(
    (day: PlaylistId) => updatePrefs((prev) => ({ ...prev, agendaDay: day })),
    [updatePrefs],
  )

  const setListCollapsed = useCallback(
    (listId: string, collapsed: boolean) =>
      updatePrefs((prev) => withListCollapsed(prev, listId, collapsed)),
    [updatePrefs],
  )

  // Capture and push deep-links point at a task; bring it on screen and flash it.
  useEffect(() => {
    if (!revealTaskId) return
    if (!state.tasks[revealTaskId]) {
      setRevealTaskId(null)
      return
    }

    const location = taskLocation(state, revealTaskId)
    if (location?.kind === 'agenda' && prefs.agendaDay !== location.day) {
      setAgendaDay(location.day)
      return
    }
    if (location?.kind === 'list' && collapsedFor(location.listId)) {
      setListCollapsed(location.listId, false)
      return
    }

    let attempts = 0
    let timer = 0
    const tryReveal = () => {
      attempts += 1
      if (revealTaskInContainer(scrollRef.current, revealTaskId)) {
        setRevealTaskId(null)
        return
      }
      if (attempts < 12) timer = window.setTimeout(tryReveal, 70)
      else setRevealTaskId(null)
    }
    timer = window.setTimeout(tryReveal, 50)
    return () => window.clearTimeout(timer)
  }, [
    revealTaskId,
    state,
    prefs.agendaDay,
    collapsedFor,
    setAgendaDay,
    setListCollapsed,
  ])

  // Notification deep-link: /?focus=<taskId>, plus the service worker fallback.
  useEffect(() => {
    const readFromUrl = () => {
      const id = readFocusTaskId()
      if (id) setFocusTaskId(id)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null
      if (!data || data.type !== 'lana-focus' || typeof data.url !== 'string') {
        return
      }
      try {
        const url = new URL(data.url, window.location.origin)
        const id = url.searchParams.get('focus')?.trim()
        if (!id) return
        window.history.replaceState(
          window.history.state,
          '',
          `${url.pathname}${url.search}${url.hash}`,
        )
        setFocusTaskId(id)
      } catch {
        // Malformed service-worker message — nothing to focus.
      }
    }

    window.addEventListener('popstate', readFromUrl)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('popstate', readFromUrl)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [])

  // The SMS webhook writes to KV first, so a deep-linked task may not be here yet.
  useEffect(() => {
    if (!focusTaskId) return

    if (state.tasks[focusTaskId]) {
      clearFocusFromUrl()
      setQuery('')
      setRevealTaskId(focusTaskId)
      setFocusTaskId(null)
      return
    }

    let cancelled = false
    let attempts = 0
    let timer = 0

    const pull = async () => {
      if (cancelled) return
      attempts += 1
      try {
        await store.refreshFromCloud()
      } catch {
        // Offline or KV unset — the inbox poll below is the fallback.
      }
      if (attempts === 1 || attempts === 4) void checkNow()
      if (cancelled) return
      if (attempts < FOCUS_ATTEMPTS) {
        timer = window.setTimeout(() => void pull(), FOCUS_INTERVAL_MS)
      } else {
        clearFocusFromUrl()
        setFocusTaskId(null)
      }
    }

    void pull()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [focusTaskId, state.tasks, store, checkNow])

  const onCapture = useCallback(
    (raw: string) => {
      const created = store.capture(raw)
      if (created.length === 0) return
      setQuery('')
      setRevealTaskId(created[0])
    },
    [store],
  )

  const openTask = store.state.tasks[openTaskId ?? ''] ?? null
  const openTaskLocation = openTaskId ? taskLocation(state, openTaskId) : null

  const openTaskSiblings = useMemo(() => {
    if (!openTaskLocation) return { visible: [] as string[], canReorder: false }
    if (openTaskLocation.kind === 'agenda') {
      return {
        visible: agendaTasks(state, openTaskLocation.day).map((t) => t.id),
        canReorder: !(
          openTaskLocation.day === 'today' && state.sortTodayByTime
        ),
      }
    }
    const section = listSection(state, openTaskLocation.listId, {
      sort: prefs.listSort,
    })
    return {
      visible: section?.tasks.map((t) => t.id) ?? [],
      canReorder: prefs.listSort === 'custom',
    }
  }, [state, openTaskLocation, prefs.listSort])

  const planTask = useCallback(
    (taskId: string, day: PlaylistId | null) => {
      if (day) {
        store.addToPlaylist(taskId, day)
        setAgendaDay(day)
        return
      }
      const current = findPlaylistContaining(stateRef.current, taskId)
      if (current) store.removeFromPlaylist(taskId, current)
    },
    [store, setAgendaDay],
  )

  const moveTask = useCallback(
    (taskId: string, direction: MoveDirection) => {
      const current = stateRef.current
      const location = taskLocation(current, taskId)
      if (!location) return

      if (location.kind === 'agenda') {
        const full = current.playlists[location.day]
        const visible = agendaTasks(current, location.day).map((t) => t.id)
        const next = moveInOrder(full, visible, taskId, direction)
        if (next !== full) store.reorderPlaylist(location.day, next)
        return
      }

      const full = orderedListTasks(current, location.listId)
      const visible =
        listSection(current, location.listId, {
          sort: prefs.listSort,
        })?.tasks.map((t) => t.id) ?? []
      const next = moveInOrder(full, visible, taskId, direction)
      if (next !== full) store.reorderListTasks(location.listId, next)
    },
    [store, prefs.listSort],
  )

  const moveList = useCallback(
    (listId: string, direction: MoveDirection) => {
      const order = mobileListOrder(stateRef.current)
      const next = moveInOrder(order, order, listId, direction)
      if (next !== order) store.reorderListCards(next)
    },
    [store],
  )

  const requestDeleteTask = useCallback(
    (taskId: string) => {
      const task = stateRef.current.tasks[taskId]
      if (!task) return
      setOpenTaskId(null)
      setPendingDelete({ kind: 'task', id: taskId, label: task.text })
    },
    [],
  )

  const requestDeleteList = useCallback((listId: string) => {
    const current = stateRef.current
    const list = current.lists.find((l) => l.id === listId)
    if (!list) return
    setOpenListId(null)
    setPendingDelete({
      kind: 'list',
      id: listId,
      label: list.name,
      taskCount: Object.values(current.tasks).filter((t) => t.listId === listId)
        .length,
    })
  }, [])

  const completedCount = useMemo(
    () => Object.values(state.tasks).filter((task) => task.completed).length,
    [state.tasks],
  )

  const openList = state.lists.find((l) => l.id === openListId) ?? null
  const openListTaskCount = openList
    ? Object.values(state.tasks).filter((t) => t.listId === openList.id).length
    : 0

  return (
    <div ref={rootRef} className={`mos theme-${state.theme}`}>
      <MobileHeader
        liveClock={liveClock}
        canUndo={store.canUndo}
        textCaptureConnected={textCaptureConnected}
        onUndo={store.undo}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <main ref={scrollRef} className="mos-scroll">
        <AgendaSection
          state={state}
          day={prefs.agendaDay}
          query={query}
          liveDate={liveDate}
          onDayChange={setAgendaDay}
          onToggleTask={store.toggleComplete}
          onOpenTask={setOpenTaskId}
        />

        <ListsPane
          sections={sections}
          lists={state.lists}
          query={query}
          sort={prefs.listSort}
          reordering={reordering}
          isCollapsed={collapsedFor}
          onQueryChange={setQuery}
          onSortChange={(listSort) =>
            updatePrefs((prev) => ({ ...prev, listSort }))
          }
          onReorderingChange={setReordering}
          onToggleCollapsed={(listId) =>
            setListCollapsed(listId, !collapsedFor(listId))
          }
          onMoveList={moveList}
          onOpenListMenu={setOpenListId}
          onToggleTask={store.toggleComplete}
          onOpenTask={setOpenTaskId}
          onAddTask={store.addTaskToList}
        />
      </main>

      <CaptureBar onCapture={onCapture} />

      <TaskSheet
        task={openTask}
        lists={state.lists}
        location={openTaskLocation}
        canReorder={openTaskSiblings.canReorder}
        canMoveUp={
          openTaskId
            ? canMoveInOrder(openTaskSiblings.visible, openTaskId, -1)
            : false
        }
        canMoveDown={
          openTaskId
            ? canMoveInOrder(openTaskSiblings.visible, openTaskId, 1)
            : false
        }
        onClose={() => setOpenTaskId(null)}
        onRename={store.setTaskText}
        onPlan={planTask}
        onTimeChange={store.setTaskTime}
        onListChange={store.setTaskList}
        onMove={moveTask}
        onToggleComplete={store.toggleComplete}
        onDelete={requestDeleteTask}
      />

      <ListSheet
        list={openList}
        taskCount={openListTaskCount}
        onClose={() => setOpenListId(null)}
        onRename={store.renameList}
        onStartReorder={() => {
          setOpenListId(null)
          setReordering(true)
        }}
        onDelete={requestDeleteList}
      />

      <MenuSheet
        open={menuOpen}
        theme={state.theme}
        trashCount={state.trash.length}
        completedCount={completedCount}
        onClose={() => setMenuOpen(false)}
        onNewList={() => {
          setMenuOpen(false)
          setNewListOpen(true)
        }}
        onReorderLists={() => {
          setMenuOpen(false)
          setReordering(true)
        }}
        onClearCompleted={() => {
          setMenuOpen(false)
          store.clearCompleted()
        }}
        onOpenTrash={() => {
          setMenuOpen(false)
          setTrashOpen(true)
        }}
        onToggleTheme={store.toggleTheme}
        onOpenSettings={() => {
          setMenuOpen(false)
          setSettingsOpen(true)
        }}
      />

      <SettingsSheet
        open={settingsOpen}
        sortTodayByTime={state.sortTodayByTime}
        textCaptureConnected={textCaptureConnected}
        textCaptureChecking={textCaptureChecking}
        onClose={() => setSettingsOpen(false)}
        onSortTodayByTimeChange={store.setSortTodayByTime}
        onCheckTexts={() => void checkNow()}
      />

      <TrashSheet
        open={trashOpen}
        trash={state.trash}
        onClose={() => setTrashOpen(false)}
        onRestore={store.restoreFromTrash}
        onDeletePermanently={store.permanentlyDeleteFromTrash}
      />

      <PromptSheet
        open={newListOpen}
        title="New list"
        label="List name"
        submitLabel="Create list"
        onCancel={() => setNewListOpen(false)}
        onSubmit={(name) => {
          store.createList(name)
          setNewListOpen(false)
        }}
      />

      <ConfirmSheet
        open={pendingDelete !== null}
        title={pendingDelete?.kind === 'list' ? 'Delete list?' : 'Delete task?'}
        message={
          pendingDelete?.kind === 'list'
            ? `“${pendingDelete.label}” and its ${pendingDelete.taskCount} task${pendingDelete.taskCount === 1 ? '' : 's'} move to Recently deleted, where you can restore them for 24 hours.`
            : pendingDelete
              ? `“${pendingDelete.label}” moves to Recently deleted, where you can restore it for 24 hours.`
              : ''
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          if (pendingDelete.kind === 'task') store.deleteTask(pendingDelete.id)
          else store.deleteList(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
