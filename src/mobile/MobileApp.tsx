import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { LanaStore } from '../hooks/useLanaStore'
import { useTwilioInbox } from '../hooks/useTwilioInbox'
import { findPlaylistContaining } from '../lib/board'
import { upcomingCommitments, weekCommitments } from '../lib/commitments'
import { clearFocusFromUrl, readFocusTaskId } from '../lib/focusTask'
import { accentColor } from '../lib/mobilePrefs'
import {
  dayOpenCount,
  listOverviews,
  listSection,
  mobileListOrder,
  searchTasks,
  taskLocation,
} from '../lib/mobileSelectors'
import type { MobileTab } from '../lib/mobileTabs'
import { nowCard as pickNowCard } from '../lib/nowCard'
import { recentlyUsedListIds } from '../lib/listSuggest'
import { moveWithinGroup } from '../lib/reorder'
import { localDateKey } from '../lib/storage'
import { triageCards, triageCount } from '../lib/triage'
import type { PlaylistId } from '../lib/types'
import { CaptureBar } from './components/CaptureBar'
import { CommitmentSheet, type CommitmentDraft } from './components/CommitmentSheet'
import { ConfirmSheet } from './components/ConfirmSheet'
import { ListSheet } from './components/ListSheet'
import { Onboarding } from './components/Onboarding'
import { PlanSheet } from './components/PlanSheet'
import { PromptSheet } from './components/PromptSheet'
import { ScreenHeader } from './components/ScreenHeader'
import { SortSheet } from './components/SortSheet'
import { TabBar } from './components/TabBar'
import { TaskSheet } from './components/TaskSheet'
import { Toast } from './components/Toast'
import { TrashSheet } from './components/TrashSheet'
import { MoreIcon, PlusIcon } from './components/icons'
import { useCalendarFeed } from './hooks/useCalendarFeed'
import { useCaptureNumber } from './hooks/useCaptureNumber'
import { useKeyboardInset } from './hooks/useKeyboardInset'
import { useMobilePrefs } from './hooks/useMobilePrefs'
import { useReminderSweep } from './hooks/useReminderSweep'
import { revealTask } from './revealTask'
import { CalendarScreen } from './screens/CalendarScreen'
import { ListDetailScreen } from './screens/ListDetailScreen'
import { ListsScreen } from './screens/ListsScreen'
import { PlaylistScreen } from './screens/PlaylistScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import './mobile.css'

const CLOCK_TICK_MS = 30_000
/** How long a push deep-link waits for the SMS webhook's task to sync in. */
const FOCUS_ATTEMPTS = 10
const FOCUS_INTERVAL_MS = 500

type ToastState = {
  message: string
  token: number
  variant: 'bar' | 'pill'
  undo: () => void
}

/** A task that is on screen needs no confirmation; you can see it arrive. */
function isTaskVisible(root: HTMLElement | null, taskId: string): boolean {
  const row = root?.querySelector<HTMLElement>(`[data-mos-task="${taskId}"]`)
  const scroller = row?.closest<HTMLElement>('.mos-scroll')
  if (!row || !scroller) return false
  const rowBox = row.getBoundingClientRect()
  const box = scroller.getBoundingClientRect()
  return rowBox.top >= box.top && rowBox.bottom <= box.bottom
}

/**
 * Four tabs over one shared store: Playlist (the plan), Lists (where tasks
 * live), Calendar (what is dated), Settings. The shell owns navigation, the
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
  const { tab, playlistDay, listSort } = prefs

  const [query, setQuery] = useState('')
  const [listDetailId, setListDetailId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [listSheetOpen, setListSheetOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [planDay, setPlanDay] = useState<PlaylistId | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [newListOpen, setNewListOpen] = useState(false)
  const [pendingListDelete, setPendingListDelete] = useState<{
    id: string
    label: string
    taskCount: number
  } | null>(null)
  const [revealTaskId, setRevealTaskId] = useState<string | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(readFocusTaskId)
  const [now, setNow] = useState(() => new Date())
  const [shuffleIndex, setShuffleIndex] = useState(0)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [commitmentSheet, setCommitmentSheet] = useState<{
    id: string | null
  } | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const captureNumber = useCaptureNumber(prefs.captureNumber)
  const feed = useCalendarFeed(prefs.calendarFeedUrl)
  useReminderSweep(prefs.onboarded)

  const todayKey = useMemo(() => localDateKey(now), [now])

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

  /** Tapping the tab you are already on pops back to the top of it. */
  const selectTab = useCallback(
    (next: MobileTab) => {
      if (next === tab && next === 'lists') setListDetailId(null)
      setTab(next)
    },
    [tab, setTab],
  )

  const overviews = useMemo(() => listOverviews(state), [state])
  const results = useMemo(() => searchTasks(state, query), [state, query])
  const recentListIds = useMemo(() => recentlyUsedListIds(state), [state])
  const triage = useMemo(() => triageCards(state), [state])
  const triageTotal = useMemo(() => triageCount(state), [state])
  const detailSection = useMemo(
    () =>
      listDetailId ? listSection(state, listDetailId, { sort: listSort }) : null,
    [state, listDetailId, listSort],
  )
  const detailOverview = listDetailId
    ? (overviews.find((o) => o.list.id === listDetailId) ?? null)
    : null

  const nowCard = useMemo(
    () =>
      pickNowCard(state, {
        now,
        leadMinutes: prefs.nowLeadMinutes,
        shuffleSource: prefs.shuffleSource,
        shuffleIndex,
      }),
    [state, now, prefs.nowLeadMinutes, prefs.shuffleSource, shuffleIndex],
  )

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

  const toastToken = useRef(0)
  const showToast = useCallback((message: string, undo: () => void) => {
    toastToken.current += 1
    setToast({ message, token: toastToken.current, variant: 'bar', undo })
  }, [])
  const showPill = useCallback((message: string) => {
    toastToken.current += 1
    setToast({
      message,
      token: toastToken.current,
      variant: 'pill',
      undo: () => {},
    })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  /**
   * Capture files the thought and gets out of the way. When it lands on the
   * screen you are looking at, the row flashes and that is confirmation
   * enough; when the classifier files it somewhere else, a pill says where.
   */
  const onCapture = useCallback(
    (raw: string) => {
      const created = store.capture(raw)
      if (created.length === 0) return
      setQuery('')

      const taskId = created[0]
      window.setTimeout(() => {
        const current = stateRef.current
        const task = current.tasks[taskId]
        if (!task) return
        if (created.length === 1 && isTaskVisible(rootRef.current, taskId)) {
          // A blink, not a badge: several captures in a row must not leave the
          // queue looking like it has highlighted rows in it.
          revealTask(rootRef.current, taskId, { highlightMs: 1100 })
          return
        }
        const list = current.lists.find((l) => l.id === task.listId)
        showPill(
          created.length > 1
            ? `Added ${created.length} items`
            : `Added to ${list?.name ?? 'your lists'}`,
        )
      }, 60)
    },
    [store, showPill],
  )

  const openTask = state.tasks[openTaskId ?? ''] ?? null
  const openTaskLocation = openTaskId ? taskLocation(state, openTaskId) : null

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

  const reorderLists = useCallback(
    (group: string[], activeId: string, overId: string) => {
      const order = mobileListOrder(stateRef.current)
      const next = moveWithinGroup(order, group, activeId, overId)
      if (next !== order) store.reorderListCards(next)
    },
    [store],
  )

  const tasksForList = useCallback(
    (listId: string) => listSection(state, listId)?.tasks ?? [],
    [state],
  )

  /** Completing, deleting, and clearing all stay reversible for a few seconds. */
  const toggleTask = useCallback(
    (taskId: string) => {
      const task = stateRef.current.tasks[taskId]
      store.toggleComplete(taskId)
      if (task && !task.completed) {
        showToast(`Done · ${task.text}`, store.undo)
      }
    },
    [store, showToast],
  )

  const deleteTask = useCallback(
    (taskId: string) => {
      const task = stateRef.current.tasks[taskId]
      if (!task) return
      setOpenTaskId(null)
      store.deleteTask(taskId)
      showToast(`Deleted · ${task.text}`, store.undo)
    },
    [store, showToast],
  )

  const clearCompletedTasks = useCallback(
    (taskIds: string[]) => {
      if (taskIds.length === 0) return
      store.clearCompletedTasks(taskIds)
      showToast(
        `Cleared ${taskIds.length} completed`,
        store.undo,
      )
    },
    [store, showToast],
  )

  const requestDeleteList = useCallback((listId: string) => {
    const current = stateRef.current
    const list = current.lists.find((l) => l.id === listId)
    if (!list) return
    setListSheetOpen(false)
    setPendingListDelete({
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

  /** The Calendar header says what is committed, not what time it is. */
  const agendaSummary = useMemo(() => {
    const week = prefs.agendaView === 'week'
    const open = (
      week
        ? weekCommitments(state, todayKey)
        : upcomingCommitments(state, todayKey)
    ).filter((commitment) => !commitment.done).length
    if (open === 0) return week ? 'Nothing this week' : 'Nothing further out'
    return `${open} ${week ? 'this week' : 'upcoming'}`
  }, [state, todayKey, prefs.agendaView])

  const saveCommitment = useCallback(
    (draft: CommitmentDraft) => {
      const editingId = commitmentSheet?.id ?? null
      if (editingId) store.updateCommitment(editingId, draft)
      else store.addCommitment(draft)
    },
    [store, commitmentSheet],
  )

  const captureVisible = tab === 'playlist' || tab === 'lists'
  /*
   * The open list is remembered across tabs, so the capture bar only addresses
   * it while that list is the screen you are actually looking at.
   */
  const captureList =
    tab === 'lists' && detailSection ? detailSection.list : null
  const openToday = dayOpenCount(state, 'today', todayKey)
  const openLists = overviews.reduce((sum, o) => sum + o.open, 0)
  const rootStyle = { '--accent': accentColor(prefs.accent) } as CSSProperties
  const rootClass = [
    'mos',
    `theme-${state.theme}`,
    captureVisible ? 'has-capture' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (!prefs.onboarded) {
    return (
      <div ref={rootRef} className={`mos theme-${state.theme}`} style={rootStyle}>
        <Onboarding
          captureNumber={captureNumber}
          onDone={() => updatePrefs((prev) => ({ ...prev, onboarded: true }))}
        />
      </div>
    )
  }

  return (
    <div ref={rootRef} className={rootClass} style={rootStyle}>
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
              </>
            }
          />
          <PlaylistScreen
            state={state}
            day={playlistDay}
            todayKey={todayKey}
            nowCard={nowCard}
            completedOpen={completedOpen}
            onDayChange={setPlaylistDay}
            onShuffle={() => setShuffleIndex((index) => index + 1)}
            onToggleTask={toggleTask}
            onOpenTask={setOpenTaskId}
            onTimeChange={store.setTaskTime}
            onToggleCommitment={store.toggleCommitmentDone}
            onOpenCommitment={(id) => setCommitmentSheet({ id })}
            onToggleCompletedOpen={() => setCompletedOpen((open) => !open)}
            onClearCompleted={clearCompletedTasks}
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
              <button
                type="button"
                className="mos-icon-btn"
                aria-label={`Options for ${detailSection.list.name}`}
                onClick={() => setListSheetOpen(true)}
              >
                <MoreIcon />
              </button>
            }
          />
          <ListDetailScreen
            section={detailSection}
            lists={state.lists}
            sort={listSort}
            plannedCount={detailOverview?.planned ?? 0}
            onOpenSort={() => setSortOpen(true)}
            onToggleTask={toggleTask}
            onOpenTask={setOpenTaskId}
          />
        </>
      )}

      {tab === 'lists' && !detailSection && (
        <>
          <ScreenHeader
            title="Lists"
            subtitle={`${overviews.length} lists · ${openLists} open`}
            actions={
              <button
                type="button"
                className="mos-icon-btn"
                aria-label="New list"
                onClick={() => setNewListOpen(true)}
              >
                <PlusIcon />
              </button>
            }
          />
          <ListsScreen
            overviews={overviews}
            lists={state.lists}
            query={query}
            results={results}
            triage={triage}
            triageTotal={triageTotal}
            tasksForList={tasksForList}
            onQueryChange={setQuery}
            onOpenList={setListDetailId}
            onReorder={reorderLists}
            onTogglePin={store.toggleListPinned}
            onToggleTask={toggleTask}
            onOpenTask={setOpenTaskId}
            onTriageFile={store.setTaskList}
            onTriageKeep={store.keepTaskList}
            onTriageToday={(taskId) => {
              store.addToPlaylist(taskId, 'today')
              store.keepTaskList(taskId)
            }}
          />
        </>
      )}

      {tab === 'calendar' && (
        <>
          <ScreenHeader
            title="Calendar"
            subtitle={agendaSummary}
            actions={
              <button
                type="button"
                className="mos-icon-btn"
                aria-label="New commitment"
                onClick={() => setCommitmentSheet({ id: null })}
              >
                <PlusIcon />
              </button>
            }
          />
          <CalendarScreen
            state={state}
            todayKey={todayKey}
            view={prefs.agendaView}
            feedEvents={feed.events}
            feedStatus={feed.status}
            onViewChange={(agendaView) =>
              updatePrefs((prev) => ({ ...prev, agendaView }))
            }
            onToggleCommitment={store.toggleCommitmentDone}
            onOpenCommitment={(id) => setCommitmentSheet({ id })}
            onAddCommitment={() => setCommitmentSheet({ id: null })}
            onConnectCalendar={() => setTab('settings')}
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
            captureNumber={captureNumber}
            lists={state.lists}
            unsureCapture={state.unsureCapture}
            unsureListId={state.unsureListId}
            prefs={prefs}
            onToggleTheme={store.toggleTheme}
            onSortTodayByTimeChange={store.setSortTodayByTime}
            onCaptureNumberChange={(captureNumberOverride) =>
              updatePrefs((prev) => ({
                ...prev,
                captureNumber: captureNumberOverride,
              }))
            }
            onUnsureCaptureChange={store.setUnsureCapture}
            onAccentChange={(accent) =>
              updatePrefs((prev) => ({ ...prev, accent }))
            }
            onNowLeadChange={(nowLeadMinutes) =>
              updatePrefs((prev) => ({ ...prev, nowLeadMinutes }))
            }
            onShuffleSourceChange={(shuffleSource) =>
              updatePrefs((prev) => ({ ...prev, shuffleSource }))
            }
            onCalendarFeedChange={(calendarFeedUrl) =>
              updatePrefs((prev) => ({ ...prev, calendarFeedUrl }))
            }
            onNewList={() => setNewListOpen(true)}
            canUndo={store.canUndo}
            onUndo={store.undo}
            onClearCompleted={store.clearCompleted}
            onOpenTrash={() => setTrashOpen(true)}
            onCheckTexts={() => void checkNow()}
            onReplayOnboarding={() =>
              updatePrefs((prev) => ({ ...prev, onboarded: false }))
            }
          />
        </>
      )}

      {captureVisible &&
        (captureList ? (
          <CaptureBar
            key={captureList.id}
            placeholder={`Add to ${captureList.name}`}
            stayFocused
            onCapture={(text) => store.addTaskToList(captureList.id, text)}
          />
        ) : (
          <CaptureBar key="capture" onCapture={onCapture} />
        ))}

      <Toast
        message={toast?.message ?? null}
        token={toast?.token ?? 0}
        variant={toast?.variant ?? 'bar'}
        durationMs={toast?.variant === 'pill' ? 2200 : 4500}
        onAction={() => toast?.undo()}
        onDismiss={dismissToast}
      />

      <TabBar tab={tab} badges={{ playlist: openToday }} onSelect={selectTab} />

      <TaskSheet
        task={openTask}
        lists={state.lists}
        location={openTaskLocation}
        recentListIds={recentListIds}
        onClose={() => setOpenTaskId(null)}
        onRename={store.setTaskText}
        onPlan={planTask}
        onTimeChange={store.setTaskTime}
        onListChange={store.setTaskList}
        onDelete={deleteTask}
      />

      <CommitmentSheet
        open={commitmentSheet !== null}
        commitment={
          state.commitments.find((c) => c.id === commitmentSheet?.id) ?? null
        }
        lists={state.lists}
        defaultDate={todayKey}
        pushEnabled={typeof Notification !== 'undefined' && Notification.permission === 'granted'}
        onClose={() => setCommitmentSheet(null)}
        onSave={saveCommitment}
        onDelete={store.deleteCommitment}
      />

      <ListSheet
        list={listSheetOpen ? (detailSection?.list ?? null) : null}
        taskCount={
          (detailOverview?.total ?? 0) + (detailOverview?.planned ?? 0)
        }
        onClose={() => setListSheetOpen(false)}
        onRename={store.renameList}
        onTogglePin={store.toggleListPinned}
        onDelete={requestDeleteList}
      />

      <PlanSheet
        open={planDay !== null}
        state={state}
        day={planDay ?? playlistDay}
        onClose={() => setPlanDay(null)}
        onPlan={store.addToPlaylist}
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
        open={pendingListDelete !== null}
        title="Delete list?"
        message={
          pendingListDelete
            ? `“${pendingListDelete.label}” and its ${pendingListDelete.taskCount} task${pendingListDelete.taskCount === 1 ? '' : 's'} move to Recently deleted, where you can restore them for 24 hours.`
            : ''
        }
        confirmLabel="Delete"
        onCancel={() => setPendingListDelete(null)}
        onConfirm={() => {
          if (!pendingListDelete) return
          store.deleteList(pendingListDelete.id)
          setPendingListDelete(null)
        }}
      />
    </div>
  )
}
