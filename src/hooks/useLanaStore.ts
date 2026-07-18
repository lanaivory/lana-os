import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { AppState, PlaylistId, Task } from '../lib/types'

export type CaptureFlash = {
  id: string
  text: string
  listId: string
  playlistId: PlaylistId | null
}

function withPurgeAndRollover(state: AppState): AppState {
  return purgeStaleCompletions(applyMorningRollover(state))
}

export function useLanaStore() {
  const [state, setState] = useState<AppState>(() =>
    withPurgeAndRollover(loadState()),
  )
  const [flashes, setFlashes] = useState<CaptureFlash[]>([])
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    saveState(state)
  }, [state])

  // Periodic purge of completed tasks past the 1-hour window.
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

  // Re-check rollover when the tab becomes visible (overnight leave-open).
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

  const capture = useCallback((raw: string) => {
    const pieces = splitCaptureText(raw)
    if (pieces.length === 0) return [] as CaptureFlash[]

    const newFlashes: CaptureFlash[] = []

    setState((prev) => {
      const tasks = { ...prev.tasks }
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
        if (playlistId && !playlists[playlistId].includes(id)) {
          playlists[playlistId] = [...playlists[playlistId], id]
        }
        newFlashes.push({ id, text, listId, playlistId })
      }

      return { ...prev, tasks, playlists }
    })

    setFlashes(newFlashes)
    window.setTimeout(() => setFlashes([]), 1600)
    return newFlashes
  }, [])

  const setTaskList = useCallback((taskId: string, listId: string) => {
    setState((prev) => {
      const task = prev.tasks[taskId]
      if (!task || task.listId === listId) return prev
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: { ...task, listId } },
      }
    })
  }, [])

  const setTaskText = useCallback((taskId: string, text: string) => {
    setState((prev) => {
      const task = prev.tasks[taskId]
      if (!task) return prev
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: { ...task, text } },
      }
    })
  }, [])

  const setTaskTime = useCallback((taskId: string, time: string | null) => {
    setState((prev) => {
      const task = prev.tasks[taskId]
      if (!task) return prev
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: { ...task, time } },
      }
    })
  }, [])

  const toggleComplete = useCallback((taskId: string) => {
    setState((prev) => {
      const task = prev.tasks[taskId]
      if (!task) return prev
      const next = task.completed
        ? uncompleteTask(task)
        : completeTask(task)
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: next },
      }
    })
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    setState((prev) => deleteTaskFromState(prev, taskId))
  }, [])

  const addToPlaylist = useCallback((taskId: string, playlistId: PlaylistId) => {
    setState((prev) => {
      if (!prev.tasks[taskId]) return prev
      if (prev.playlists[playlistId].includes(taskId)) return prev
      return {
        ...prev,
        playlists: {
          ...prev.playlists,
          [playlistId]: [...prev.playlists[playlistId], taskId],
        },
      }
    })
  }, [])

  const removeFromPlaylist = useCallback(
    (taskId: string, playlistId: PlaylistId) => {
      setState((prev) => ({
        ...prev,
        playlists: {
          ...prev.playlists,
          [playlistId]: prev.playlists[playlistId].filter((id) => id !== taskId),
        },
      }))
    },
    [],
  )

  const reorderPlaylist = useCallback(
    (playlistId: PlaylistId, orderedIds: string[]) => {
      setState((prev) => ({
        ...prev,
        playlists: { ...prev.playlists, [playlistId]: orderedIds },
      }))
    },
    [],
  )

  const moveBetweenPlaylists = useCallback(
    (
      taskId: string,
      from: PlaylistId | null,
      to: PlaylistId,
      toIndex: number,
    ) => {
      setState((prev) => {
        if (!prev.tasks[taskId]) return prev
        const playlists = {
          today: [...prev.playlists.today],
          tomorrow: [...prev.playlists.tomorrow],
          week: [...prev.playlists.week],
        }
        if (from) {
          playlists[from] = playlists[from].filter((id) => id !== taskId)
        }
        const dest = playlists[to].filter((id) => id !== taskId)
        const idx = Math.max(0, Math.min(toIndex, dest.length))
        dest.splice(idx, 0, taskId)
        playlists[to] = dest
        return { ...prev, playlists }
      })
    },
    [],
  )

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

  return {
    state,
    flashes,
    capture,
    setTaskList,
    setTaskText,
    setTaskTime,
    toggleComplete,
    deleteTask,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    moveBetweenPlaylists,
    toggleListCollapsed,
    togglePlaylistCollapsed,
  }
}
