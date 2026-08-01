import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ensureBoardHasCards,
  insertCardOnBoard,
  withListOrderAppend,
  withListOrderRemove,
  withReorderedListCards,
} from '../lib/board'
import {
  applyCaptureToState,
  mergeMissingSmsTasks,
  resolveActiveListId,
} from '../lib/capturePipeline'
import { classifyTask } from '../lib/classifier'
import {
  fetchCloudState,
  pushCloudState,
  statesEqual,
} from '../lib/cloudSync'
import {
  completeTask,
  purgeStaleCompletions,
  uncompleteTask,
} from '../lib/completion'
import { createId } from '../lib/id'
import { applyMorningRollover } from '../lib/rollover'
import { loadState, saveState } from '../lib/storage'
import {
  permanentlyDeleteTrashEntry,
  purgeExpiredTrash,
  restoreTrashEntry,
  softDeleteList,
  softDeleteTask,
} from '../lib/trash'
import type {
  AppState,
  PlaylistId,
  Task,
  ThemeMode,
  TrashEntry,
} from '../lib/types'
import { LIST_COLORS } from '../lib/types'

const UNDO_LIMIT = 30
const CLOUD_SAVE_DEBOUNCE_MS = 600
const CLOUD_POLL_MS = 12_000

function withPurgeAndRollover(state: AppState): AppState {
  return purgeExpiredTrash(purgeStaleCompletions(applyMorningRollover(state)))
}

function cloneState(state: AppState): AppState {
  return structuredClone(state)
}

function stripFromAllPlaylists(state: AppState, taskId: string): AppState['playlists'] {
  return {
    today: state.playlists.today.filter((id) => id !== taskId),
    tomorrow: state.playlists.tomorrow.filter((id) => id !== taskId),
    week: state.playlists.week.filter((id) => id !== taskId),
  }
}

export function useLanaStore() {
  const [state, setState] = useState<AppState>(() =>
    withPurgeAndRollover(loadState()),
  )
  const [undoStack, setUndoStack] = useState<AppState[]>([])
  const hydrated = useRef(false)
  const cloudReady = useRef(false)
  const applyingRemote = useRef(false)
  const pendingCloudSave = useRef(false)
  const saveTimer = useRef<number | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Local cache on every change; debounced cloud push after hydration.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    saveState(state)

    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    if (!cloudReady.current) return

    pendingCloudSave.current = true
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          // Merge any SMS tasks the webhook wrote while we were editing locally.
          const remote = await fetchCloudState()
          let snapshot = stateRef.current
          if (remote) {
            const merged = mergeMissingSmsTasks(snapshot, remote)
            if (merged !== snapshot) {
              applyingRemote.current = true
              snapshot = merged
              setState(merged)
              saveState(merged)
            }
          }
          await pushCloudState(snapshot)
        } finally {
          pendingCloudSave.current = false
        }
      })()
    }, CLOUD_SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
    }
  }, [state])

  // Initial cloud hydrate + cross-device poll.
  useEffect(() => {
    let cancelled = false

    const applyRemote = (remote: AppState) => {
      const next = withPurgeAndRollover(remote)
      if (statesEqual(next, stateRef.current)) return
      applyingRemote.current = true
      setState(next)
      saveState(next)
    }

    const pull = async () => {
      const remote = await fetchCloudState()
      if (cancelled || !remote) return
      if (pendingCloudSave.current) return
      applyRemote(remote)
    }

    ;(async () => {
      const remote = await fetchCloudState()
      if (cancelled) return
      if (remote) applyRemote(remote)
      cloudReady.current = true
      // Seed cloud from this device if KV was empty.
      if (!remote) {
        void pushCloudState(stateRef.current)
      }
    })()

    const id = window.setInterval(() => {
      void pull()
    }, CLOUD_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const next = purgeExpiredTrash(purgeStaleCompletions(prev))
        return next === prev ? prev : next
      })
    }
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      setState((prev) => {
        const next = applyMorningRollover(prev)
        return next === prev ? prev : next
      })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const commit = useCallback((updater: (prev: AppState) => AppState) => {
    const prev = stateRef.current
    const next = updater(prev)
    if (next === prev) return
    // Block cloud poll from overwriting before the save effect marks pending.
    pendingCloudSave.current = true
    setUndoStack((stack) => {
      const stacked = [...stack, cloneState(prev)]
      return stacked.length > UNDO_LIMIT ? stacked.slice(-UNDO_LIMIT) : stacked
    })
    setState(next)
  }, [])

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const prev = stack[stack.length - 1]
      setState(prev)
      return stack.slice(0, -1)
    })
  }, [])

  const capture = useCallback(
    (raw: string, opts?: { fromText?: boolean; messageSid?: string }): string[] => {
      let createdIds: string[] = []
      commit((prev) => {
        const result = applyCaptureToState(prev, raw, opts)
        createdIds = result.createdIds
        return result.state
      })
      return createdIds
    },
    [commit],
  )

  /**
   * Pull shared KV board now (used by notification deep-links).
   * Returns the applied remote state, or null when unavailable / blocked.
   */
  const refreshFromCloud = useCallback(async (): Promise<AppState | null> => {
    const remote = await fetchCloudState()
    if (!remote) return stateRef.current
    // Prefer remote when focusing a push deep-link even if a local save is pending —
    // SMS webhook writes land in KV first and must win for the task to appear.
    const next = withPurgeAndRollover(remote)
    if (!statesEqual(next, stateRef.current)) {
      applyingRemote.current = true
      // Don't clobber an in-progress local edit push forever; clear pending so
      // subsequent polls can continue, then let the save effect skip this apply.
      pendingCloudSave.current = false
      setState(next)
      saveState(next)
    }
    return next
  }, [])

  /** Clear NEW badge without pushing undo history. */
  const clearNew = useCallback((taskId: string) => {
    setState((prev) => {
      const task = prev.tasks[taskId]
      if (!task?.isNew) return prev
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: { ...task, isNew: false } },
      }
    })
  }, [])

  const setTaskList = useCallback(
    (taskId: string, listId: string) => {
      commit((prev) => {
        const task = prev.tasks[taskId]
        if (!task || task.listId === listId) return prev
        let listOrders = withListOrderRemove(prev.listOrders, taskId)
        listOrders = withListOrderAppend(listOrders, listId, taskId)
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: { ...task, listId, isNew: false },
          },
          listOrders,
        }
      })
    },
    [commit],
  )

  const setTaskText = useCallback(
    (taskId: string, text: string) => {
      commit((prev) => {
        const task = prev.tasks[taskId]
        if (!task) return prev
        return {
          ...prev,
          tasks: { ...prev.tasks, [taskId]: { ...task, text } },
        }
      })
    },
    [commit],
  )

  const setTaskTime = useCallback(
    (taskId: string, time: string | null) => {
      commit((prev) => {
        const task = prev.tasks[taskId]
        if (!task) return prev
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: { ...task, time, isNew: false },
          },
        }
      })
    },
    [commit],
  )

  const toggleComplete = useCallback(
    (taskId: string) => {
      commit((prev) => {
        const task = prev.tasks[taskId]
        if (!task) return prev
        const next = task.completed ? uncompleteTask(task) : completeTask(task)
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: { ...next, isNew: false },
          },
        }
      })
    },
    [commit],
  )

  const deleteTask = useCallback(
    (taskId: string) => {
      commit((prev) => softDeleteTask(prev, taskId))
    },
    [commit],
  )

  const deleteList = useCallback(
    (listId: string) => {
      commit((prev) => softDeleteList(prev, listId))
    },
    [commit],
  )

  const restoreFromTrash = useCallback(
    (entry: TrashEntry) => {
      commit((prev) => restoreTrashEntry(prev, entry))
    },
    [commit],
  )

  const permanentlyDeleteFromTrash = useCallback(
    (entry: TrashEntry) => {
      commit((prev) => permanentlyDeleteTrashEntry(prev, entry))
    },
    [commit],
  )

  const clearCompleted = useCallback(() => {
    commit((prev) => {
      let next = prev
      for (const [id, task] of Object.entries(prev.tasks)) {
        if (task.completed) {
          next = softDeleteTask(next, id)
        }
      }
      return next
    })
  }, [commit])

  const addToPlaylist = useCallback(
    (taskId: string, playlistId: PlaylistId) => {
      commit((prev) => {
        if (!prev.tasks[taskId]) return prev
        const playlists = stripFromAllPlaylists(prev, taskId)
        playlists[playlistId] = [...playlists[playlistId], taskId]
        return { ...prev, playlists }
      })
    },
    [commit],
  )

  const removeFromPlaylist = useCallback(
    (taskId: string, playlistId: PlaylistId) => {
      commit((prev) => ({
        ...prev,
        playlists: {
          ...prev.playlists,
          [playlistId]: prev.playlists[playlistId].filter((id) => id !== taskId),
        },
      }))
    },
    [commit],
  )

  const reorderPlaylist = useCallback(
    (playlistId: PlaylistId, orderedIds: string[]) => {
      commit((prev) => ({
        ...prev,
        playlists: { ...prev.playlists, [playlistId]: orderedIds },
      }))
    },
    [commit],
  )

  const moveBetweenPlaylists = useCallback(
    (
      taskId: string,
      _from: PlaylistId | null,
      to: PlaylistId,
      toIndex: number,
    ) => {
      commit((prev) => {
        if (!prev.tasks[taskId]) return prev
        const playlists = stripFromAllPlaylists(prev, taskId)
        const dest = playlists[to].filter((id) => id !== taskId)
        const idx = Math.max(0, Math.min(toIndex, dest.length))
        dest.splice(idx, 0, taskId)
        playlists[to] = dest
        return { ...prev, playlists }
      })
    },
    [commit],
  )

  /** Move/reorder a task inside a context list; clears playlist membership. */
  const moveTaskInLists = useCallback(
    (taskId: string, toListId: string, toIndex: number) => {
      commit((prev) => {
        const task = prev.tasks[taskId]
        if (!task) return prev
        let listOrders = withListOrderRemove(prev.listOrders, taskId)
        const dest = [...(listOrders[toListId] ?? [])].filter((id) => id !== taskId)
        // Keep only ids that still belong / will belong
        const idx = Math.max(0, Math.min(toIndex, dest.length))
        dest.splice(idx, 0, taskId)
        listOrders = { ...listOrders, [toListId]: dest }
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: {
              ...task,
              listId: toListId,
              isNew: false,
            },
          },
          listOrders,
          playlists: stripFromAllPlaylists(prev, taskId),
        }
      })
    },
    [commit],
  )

  const reorderListTasks = useCallback(
    (listId: string, orderedIds: string[]) => {
      commit((prev) => ({
        ...prev,
        listOrders: { ...prev.listOrders, [listId]: orderedIds },
      }))
    },
    [commit],
  )

  const setBoardColumns = useCallback((boardColumns: string[][]) => {
    commit((prev) => ({
      ...prev,
      boardColumns: ensureBoardHasCards(
        boardColumns,
        prev.lists.map((l) => l.id),
      ),
    }))
  }, [commit])

  const moveBoardCard = useCallback(
    (
      cardId: string,
      target: { column: number; index: number } | { newColumnAt: number },
    ) => {
      commit((prev) => ({
        ...prev,
        boardColumns: insertCardOnBoard(prev.boardColumns, cardId, target),
      }))
    },
    [commit],
  )

  /** Mobile list-stack reorder: rewrite category-list board order. */
  const reorderListCards = useCallback(
    (orderedListIds: string[]) => {
      commit((prev) => ({
        ...prev,
        boardColumns: withReorderedListCards(
          prev.boardColumns,
          orderedListIds,
        ),
      }))
    },
    [commit],
  )

  const setCardHeight = useCallback((cardId: string, height: number | null) => {
    setState((prev) => {
      const cardHeights = { ...prev.cardHeights }
      if (height == null) delete cardHeights[cardId]
      else cardHeights[cardId] = height
      return { ...prev, cardHeights }
    })
  }, [])

  const setCardWidth = useCallback((cardId: string, width: number | null) => {
    setState((prev) => {
      const cardWidths = { ...prev.cardWidths }
      if (width == null) delete cardWidths[cardId]
      else cardWidths[cardId] = width
      return { ...prev, cardWidths }
    })
  }, [])

  const toggleListCollapsed = useCallback((listId: string) => {
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) =>
        l.id === listId ? { ...l, collapsed: !l.collapsed } : l,
      ),
    }))
  }, [])

  const togglePlaylistCollapsed = useCallback((playlistId: PlaylistId) => {
    setState((prev) => ({
      ...prev,
      collapsedPlaylists: {
        ...prev.collapsedPlaylists,
        [playlistId]: !prev.collapsedPlaylists[playlistId],
      },
    }))
  }, [])

  const createList = useCallback(
    (name?: string): string => {
      const id = createId()
      commit((prev) => {
        const color = LIST_COLORS[prev.lists.length % LIST_COLORS.length]
        return {
          ...prev,
          lists: [
            ...prev.lists,
            {
              id,
              name: name?.trim() || `List ${prev.lists.length + 1}`,
              collapsed: false,
              color,
            },
          ],
          boardColumns: (() => {
            const cols = prev.boardColumns.map((c) => [...c])
            const last = cols[cols.length - 1]
            if (last && last.length < 3 && !last.some((cid) => cid === 'today' || cid === 'tomorrow' || cid === 'week')) {
              last.push(id)
              return cols
            }
            return [...cols, [id]]
          })(),
          listOrders: { ...prev.listOrders, [id]: [] },
        }
      })
      return id
    },
    [commit],
  )

  const renameList = useCallback(
    (listId: string, name: string) => {
      commit((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, name: name.trim() || l.name } : l,
        ),
      }))
    },
    [commit],
  )

  const addTaskToList = useCallback(
    (listId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      commit((prev) => {
        const id = createId()
        const task: Task = {
          id,
          text: trimmed,
          listId,
          completed: false,
          completedAt: null,
          createdAt: Date.now(),
          time: null,
          overdue: false,
          isNew: false,
        }
        return {
          ...prev,
          tasks: { ...prev.tasks, [id]: task },
          listOrders: withListOrderAppend(prev.listOrders, listId, id),
        }
      })
    },
    [commit],
  )

  const addTaskToPlaylist = useCallback(
    (playlistId: PlaylistId, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      commit((prev) => {
        const listId = resolveActiveListId(prev, classifyTask(trimmed).listId)
        const id = createId()
        const task: Task = {
          id,
          text: trimmed,
          listId,
          completed: false,
          completedAt: null,
          createdAt: Date.now(),
          time: null,
          overdue: false,
          isNew: false,
        }
        const playlists = {
          ...prev.playlists,
          [playlistId]: [...prev.playlists[playlistId], id],
        }
        return {
          ...prev,
          tasks: { ...prev.tasks, [id]: task },
          playlists,
          listOrders: withListOrderAppend(prev.listOrders, listId, id),
        }
      })
    },
    [commit],
  )

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((prev) => ({ ...prev, theme }))
  }, [])

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }))
  }, [])

  const setSortTodayByTime = useCallback((sortTodayByTime: boolean) => {
    setState((prev) => ({ ...prev, sortTodayByTime }))
  }, [])

  const setWrapTaskTitles = useCallback((wrapTaskTitles: boolean) => {
    setState((prev) => ({ ...prev, wrapTaskTitles }))
  }, [])

  const setTaskTitleWrap = useCallback((taskId: string, wrap: boolean | null) => {
    setState((prev) => {
      const taskTitleWrapOverrides = { ...prev.taskTitleWrapOverrides }
      if (wrap == null) delete taskTitleWrapOverrides[taskId]
      else taskTitleWrapOverrides[taskId] = wrap
      return { ...prev, taskTitleWrapOverrides }
    })
  }, [])

  const toggleTaskTitleWrap = useCallback((taskId: string) => {
    setState((prev) => {
      const current =
        taskId in prev.taskTitleWrapOverrides
          ? prev.taskTitleWrapOverrides[taskId]
          : prev.wrapTaskTitles
      return {
        ...prev,
        taskTitleWrapOverrides: {
          ...prev.taskTitleWrapOverrides,
          [taskId]: !current,
        },
      }
    })
  }, [])

  return {
    state,
    canUndo: undoStack.length > 0,
    undo,
    capture,
    refreshFromCloud,
    clearNew,
    setTaskList,
    setTaskText,
    setTaskTime,
    toggleComplete,
    deleteTask,
    deleteList,
    restoreFromTrash,
    permanentlyDeleteFromTrash,
    clearCompleted,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    moveBetweenPlaylists,
    moveTaskInLists,
    reorderListTasks,
    setBoardColumns,
    moveBoardCard,
    reorderListCards,
    setCardHeight,
    setCardWidth,
    toggleListCollapsed,
    togglePlaylistCollapsed,
    createList,
    renameList,
    addTaskToList,
    addTaskToPlaylist,
    setTheme,
    toggleTheme,
    setSortTodayByTime,
    setWrapTaskTitles,
    setTaskTitleWrap,
    toggleTaskTitleWrap,
  }
}
