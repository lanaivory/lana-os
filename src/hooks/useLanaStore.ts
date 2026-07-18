import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ensureBoardHasCards,
  insertCardOnBoard,
  withListOrderAppend,
  withListOrderRemove,
} from '../lib/board'
import { classifyTask } from '../lib/classifier'
import {
  completeTask,
  deleteTaskFromState,
  purgeStaleCompletions,
  uncompleteTask,
} from '../lib/completion'
import { createId } from '../lib/id'
import { splitCaptureText } from '../lib/parseCapture'
import { applyMorningRollover } from '../lib/rollover'
import { loadState, saveState } from '../lib/storage'
import { routeTimingWords } from '../lib/timing'
import type { AppState, PlaylistId, Task, ThemeMode } from '../lib/types'
import { LIST_COLORS } from '../lib/types'

const UNDO_LIMIT = 30

function withPurgeAndRollover(state: AppState): AppState {
  return purgeStaleCompletions(applyMorningRollover(state))
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
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const next = purgeStaleCompletions(prev)
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
    (raw: string) => {
      const pieces = splitCaptureText(raw)
      if (pieces.length === 0) return

      commit((prev) => {
        const tasks = { ...prev.tasks }
        let listOrders = { ...prev.listOrders }
        const playlists = {
          today: [...prev.playlists.today],
          tomorrow: [...prev.playlists.tomorrow],
          week: [...prev.playlists.week],
        }

        for (const text of pieces) {
          const { listId } = classifyTask(text)
          const { playlistId } = routeTimingWords(text)
          const id = createId()
          const task: Task = {
            id,
            text,
            listId,
            completed: false,
            completedAt: null,
            createdAt: Date.now(),
            time: null,
            overdue: false,
          }
          tasks[id] = task
          listOrders = withListOrderAppend(listOrders, listId, id)
          if (playlistId && !playlists[playlistId].includes(id)) {
            playlists[playlistId] = [...playlists[playlistId], id]
          }
        }

        return { ...prev, tasks, playlists, listOrders }
      })
    },
    [commit],
  )

  const setTaskList = useCallback(
    (taskId: string, listId: string) => {
      commit((prev) => {
        const task = prev.tasks[taskId]
        if (!task || task.listId === listId) return prev
        let listOrders = withListOrderRemove(prev.listOrders, taskId)
        listOrders = withListOrderAppend(listOrders, listId, taskId)
        return {
          ...prev,
          tasks: { ...prev.tasks, [taskId]: { ...task, listId } },
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
          tasks: { ...prev.tasks, [taskId]: { ...task, time } },
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
          tasks: { ...prev.tasks, [taskId]: next },
        }
      })
    },
    [commit],
  )

  const deleteTask = useCallback(
    (taskId: string) => {
      commit((prev) => {
        const next = deleteTaskFromState(prev, taskId)
        return {
          ...next,
          listOrders: withListOrderRemove(next.listOrders, taskId),
        }
      })
    },
    [commit],
  )

  const clearCompleted = useCallback(() => {
    commit((prev) => {
      let next = prev
      for (const [id, task] of Object.entries(prev.tasks)) {
        if (task.completed) {
          next = deleteTaskFromState(next, id)
          next = {
            ...next,
            listOrders: withListOrderRemove(next.listOrders, id),
          }
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
            [taskId]: { ...task, listId: toListId },
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
    (name?: string) => {
      commit((prev) => {
        const id = createId()
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
        const { listId } = classifyTask(trimmed)
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

  return {
    state,
    canUndo: undoStack.length > 0,
    undo,
    capture,
    setTaskList,
    setTaskText,
    setTaskTime,
    toggleComplete,
    deleteTask,
    clearCompleted,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    moveBetweenPlaylists,
    moveTaskInLists,
    reorderListTasks,
    setBoardColumns,
    moveBoardCard,
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
  }
}
