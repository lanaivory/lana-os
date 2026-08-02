import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LanaStore } from '../hooks/useLanaStore'
import { useTwilioInbox } from '../hooks/useTwilioInbox'
import { findPlaylistContaining, orderedListTasks } from '../lib/board'
import { daySchedule } from '../lib/calendar'
import { clearFocusFromUrl, readFocusTaskId } from '../lib/focusTask'
import {
  agendaOpenCount,
  agendaTasks,
  listOverviews,
  listSection,
  mobileListOrder,
  searchTasks,
  taskLocation,
} from '../lib/mobileSelectors'
import type { MobileTab } from '../lib/mobileTabs'
import { canMoveInOrder, moveInOrder, type MoveDirection } from '../lib/reorder'
import type { PlaylistId } from '../lib/types'
import { CaptureBar } from './components/CaptureBar'
import { ConfirmSheet } from './components/ConfirmSheet'
import { ListSheet } from './components/ListSheet'
import { PlanSheet } from './components/PlanSheet'
import { PromptSheet } from './components/PromptSheet'
import { ScheduleSheet } from './components/ScheduleSheet'
import { ScreenHeader } from './components/ScreenHeader'
import { SortSheet } from './components/SortSheet'
import { TabBar } from './components/TabBar'
import { TaskSheet } from './components/TaskSheet'
import { TrashSheet } from './components/TrashSheet'
import { MoreIcon, PlusIcon, UndoIcon } from './components/icons'
import { useKeyboardInset } from './hooks/useKeyboardInset'
import { useMobilePrefs } from './hooks/useMobilePrefs'
import { revealTask } from './revealTask'
import { CalendarScreen } from './screens/CalendarScreen'
import { ListDetailScreen } from './screens/ListDetailScreen'
import { ListsScreen } from './screens/ListsScreen'
import { PlaylistScreen } from './screens/PlaylistScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import './mobile.css'

type PendingDelete =
  | { kind: 'task'; id: string; label: string }
  | { kind: 'list'; id: string; label: string; taskCount: number }

const CLOCK_TICK_MS = 30_000
/** How long a push deep-link waits for the SMS webhook's task to sync in. */
const FOCUS_ATTEMPTS = 10
const FOCUS_INTERVAL_MS = 500

/**
 * Four tabs over one shared store: Playlist (the plan), Lists (where tasks
 * live), Calendar (the clock), Settings. The shell owns navigation, the
 * store glue, and every sheet; each tab screen only renders its own content.
 */
export function MobileApp({ store }: { store: LanaStore }) {
  const state = store.state
  const rootRef = useRef<HTMLDivElement>(null)
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
  const { tab, playlistDay, calendarDay, listSort } = prefs

  const [query, setQuery] = useState('')
  const [listDetailId, setListDetailId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [listSheetOpen, setListSheetOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [planDay, setPlanDay] = useState<PlaylistId | null>(null)
  const [scheduleHour, setScheduleHour] = useState<number | null>(null)
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

  const setTab = useCallback(
    (next: MobileTab) => updatePrefs((prev) => ({ ...prev, tab: next })),
    [updatePrefs],
  )
  const setPlaylistDay = useCallback(
    (day: PlaylistId) => updatePrefs((prev) => ({ ...prev, playlistDay: day })),
    [updatePrefs],
  )
  const setCalendarDay = useCallback(
    (day: PlaylistId) => updatePrefs((prev) => ({ ...prev, calendarDay: day })),
    [updatePrefs],
  )

  /** Tapping the tab you are already on pops back to the top of it. */
  const selectTab = useCallback(
    (next: MobileTab) => {
      if (next === tab && next === 'lists') {
        setListDetailId(null)
        setReordering(false)
      }
      setTab(next)
    },
    [tab, setTab],
  )

  const overviews = useMemo(() => listOverviews(state), [state])
  const results = useMemo(() => searchTasks(state, query), [state, query])
  const detailSection = useMemo(
    () =>
      listDetailId ? listSection(state, listDetailId, { sort: listSort }) : null,
    [state, listDetailId, listSort],
  )
  const detailOverview = listDetailId
    ? (overviews.find((o) => o.list.id === listDetailId) ?? null)
    : null

  // A list can vanish from under the detail screen (deleted here or on desktop).
  useEffect(() => {
    if (listDetailId && !state.lists.some((l) => l.id === listDetailId)) {
      setListDetailId(null)
    }
  }, [listDetailId, state.lists])

  // Capture and push deep-links point at a task: open the tab that shows it,
  // then bring it on screen and flash it.
  useEffect(() => {
    if (!revealTaskId) return
    if (!state.tasks[revealTaskId]) {
      setRevealTaskId(null)
      return
    }

    const location = taskLocation(state, revealTaskId)
    if (location?.kind === 'agenda') {
      if (tab !== 'playlist') {
        setTab('playlist')
        return
      }
      if (playlistDay !== location.day) {
        setPlaylistDay(location.day)
        return
      }
    }
    if (location?.kind === 'list') {
      if (tab !== 'lists') {
        setTab('lists')
        return
      }
      if (listDetailId !== location.listId) {
        setListDetailId(location.listId)
        return
      }
    }

    let attempts = 0
    let timer = 0
    const tryReveal = () => {
      attempts += 1
      if (revealTask(rootRef.current, revealTaskId)) {
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
    tab,
    playlistDay,
    listDetailId,
    setTab,
    setPlaylistDay,
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

  const openTask = state.tasks[openTaskId ?? ''] ?? null
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
      sort: listSort,
    })
    return {
      visible: section?.tasks.map((t) => t.id) ?? [],
      canReorder: listSort === 'custom',
    }
  }, [state, openTaskLocation, listSort])

  const planTask = useCallback(
    (taskId: string, day: PlaylistId | null) => {
      if (day) {
        store.addToPlaylist(taskId, day)
        setPlaylistDay(day)
        return
      }
      const current = findPlaylistContaining(stateRef.current, taskId)
      if (current) store.removeFromPlaylist(taskId, current)
    },
    [store, setPlaylistDay],
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
          sort: listSort,
        })?.tasks.map((t) => t.id) ?? []
      const next = moveInOrder(full, visible, taskId, direction)
      if (next !== full) store.reorderListTasks(location.listId, next)
    },
    [store, listSort],
  )

  const moveList = useCallback(
    (listId: string, direction: MoveDirection) => {
      const order = mobileListOrder(stateRef.current)
      const next = moveInOrder(order, order, listId, direction)
      if (next !== order) store.reorderListCards(next)
    },
    [store],
  )

  const requestDeleteTask = useCallback((taskId: string) => {
    const task = stateRef.current.tasks[taskId]
    if (!task) return
    setOpenTaskId(null)
    setPendingDelete({ kind: 'task', id: taskId, label: task.text })
  }, [])

  const requestDeleteList = useCallback((listId: string) => {
    const current = stateRef.current
    const list = current.lists.find((l) => l.id === listId)
    if (!list) return
    setListSheetOpen(false)
    setPendingDelete({
      kind: 'list',
      id: listId,
      label: list.name,
      taskCount: Object.values(current.tasks).filter((t) => t.listId === listId)
        .length,
    })
  }, [])

  const startReorderLists = useCallback(() => {
    setListSheetOpen(false)
    setListDetailId(null)
    setReordering(true)
    setTab('lists')
  }, [setTab])

  const completedCount = useMemo(
    () => Object.values(state.tasks).filter((task) => task.completed).length,
    [state.tasks],
  )

  const scheduleCandidates = useMemo(
    () =>
      scheduleHour === null ? [] : daySchedule(state, calendarDay).untimed,
    [scheduleHour, state, calendarDay],
  )

  const undoButton = (
    <button
      type="button"
      className="mos-icon-btn"
      onClick={store.undo}
      disabled={!store.canUndo}
      aria-label="Undo"
    >
      <UndoIcon />
    </button>
  )

  const captureVisible = tab === 'playlist' || tab === 'lists'
  const openToday = agendaOpenCount(state, 'today')
  const openLists = overviews.reduce((sum, o) => sum + o.open, 0)

  return (
    <div ref={rootRef} className={`mos theme-${state.theme}`}>
      {tab === 'playlist' && (
        <>
          <ScreenHeader
            title="Playlist"
            subtitle={`${liveDate} · ${liveClock}`}
            actions={
              <>
                {textCaptureConnected && (
                  <span
                    className="mos-status"
                    title="Text capture connected"
                    aria-label="Text capture connected"
                  />
                )}
                {undoButton}
              </>
            }
          />
          <PlaylistScreen
            state={state}
            day={playlistDay}
            liveDate={liveDate}
            onDayChange={setPlaylistDay}
            onToggleTask={store.toggleComplete}
            onOpenTask={setOpenTaskId}
            onPlanFromLists={() => setPlanDay(playlistDay)}
          />
        </>
      )}

      {tab === 'lists' && detailSection && (
        <>
          <ScreenHeader
            title={detailSection.list.name}
            onBack={() => setListDetailId(null)}
            backLabel="All lists"
            actions={
              <>
                {undoButton}
                <button
                  type="button"
                  className="mos-icon-btn"
                  aria-label={`Options for ${detailSection.list.name}`}
                  onClick={() => setListSheetOpen(true)}
                >
                  <MoreIcon />
                </button>
              </>
            }
          />
          <ListDetailScreen
            section={detailSection}
            lists={state.lists}
            sort={listSort}
            plannedCount={detailOverview?.planned ?? 0}
            onOpenSort={() => setSortOpen(true)}
            onToggleTask={store.toggleComplete}
            onOpenTask={setOpenTaskId}
            onAddTask={store.addTaskToList}
          />
        </>
      )}

      {tab === 'lists' && !detailSection && (
        <>
          <ScreenHeader
            title="Lists"
            subtitle={`${overviews.length} lists · ${openLists} open`}
            actions={
              <>
                {undoButton}
                <button
                  type="button"
                  className="mos-icon-btn"
                  aria-label="New list"
                  onClick={() => setNewListOpen(true)}
                >
                  <PlusIcon />
                </button>
              </>
            }
          />
          <ListsScreen
            overviews={overviews}
            lists={state.lists}
            query={query}
            results={results}
            reordering={reordering}
            onQueryChange={setQuery}
            onReorderingChange={setReordering}
            onOpenList={setListDetailId}
            onMoveList={moveList}
            onToggleTask={store.toggleComplete}
            onOpenTask={setOpenTaskId}
          />
        </>
      )}

      {tab === 'calendar' && (
        <>
          <ScreenHeader title="Calendar" subtitle={liveClock} />
          <CalendarScreen
            state={state}
            day={calendarDay}
            now={now}
            onDayChange={setCalendarDay}
            onToggleTask={store.toggleComplete}
            onOpenTask={setOpenTaskId}
            onScheduleAt={setScheduleHour}
            onPlanFromLists={() => setPlanDay(calendarDay)}
          />
        </>
      )}

      {tab === 'settings' && (
        <>
          <ScreenHeader title="Settings" subtitle="Lana OS" />
          <SettingsScreen
            theme={state.theme}
            sortTodayByTime={state.sortTodayByTime}
            completedCount={completedCount}
            trashCount={state.trash.length}
            textCaptureConnected={textCaptureConnected}
            textCaptureChecking={textCaptureChecking}
            onToggleTheme={store.toggleTheme}
            onSortTodayByTimeChange={store.setSortTodayByTime}
            onNewList={() => setNewListOpen(true)}
            onReorderLists={startReorderLists}
            onClearCompleted={store.clearCompleted}
            onOpenTrash={() => setTrashOpen(true)}
            onCheckTexts={() => void checkNow()}
          />
        </>
      )}

      {captureVisible && <CaptureBar onCapture={onCapture} />}

      <TabBar tab={tab} badges={{ playlist: openToday }} onSelect={selectTab} />

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
        list={listSheetOpen ? (detailSection?.list ?? null) : null}
        taskCount={
          (detailOverview?.total ?? 0) + (detailOverview?.planned ?? 0)
        }
        onClose={() => setListSheetOpen(false)}
        onRename={store.renameList}
        onStartReorder={startReorderLists}
        onDelete={requestDeleteList}
      />

      <PlanSheet
        open={planDay !== null}
        state={state}
        day={planDay ?? playlistDay}
        onClose={() => setPlanDay(null)}
        onPlan={store.addToPlaylist}
      />

      <ScheduleSheet
        hour={scheduleHour}
        tasks={scheduleCandidates}
        onClose={() => setScheduleHour(null)}
        onSchedule={(taskId, time) => {
          store.setTaskTime(taskId, time)
          setScheduleHour(null)
        }}
      />

      <SortSheet
        open={sortOpen}
        sort={listSort}
        onClose={() => setSortOpen(false)}
        onSelect={(next) =>
          updatePrefs((prev) => ({ ...prev, listSort: next }))
        }
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
          const id = store.createList(name)
          setNewListOpen(false)
          setTab('lists')
          setListDetailId(id)
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
