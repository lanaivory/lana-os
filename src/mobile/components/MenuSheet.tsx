import type { ThemeMode } from '../../lib/types'
import { Sheet, SheetAction, SheetGroup } from './Sheet'

type Props = {
  open: boolean
  theme: ThemeMode
  trashCount: number
  completedCount: number
  onClose: () => void
  onNewList: () => void
  onReorderLists: () => void
  onClearCompleted: () => void
  onOpenTrash: () => void
  onToggleTheme: () => void
  onOpenSettings: () => void
}

export function MenuSheet({
  open,
  theme,
  trashCount,
  completedCount,
  onClose,
  onNewList,
  onReorderLists,
  onClearCompleted,
  onOpenTrash,
  onToggleTheme,
  onOpenSettings,
}: Props) {
  return (
    <Sheet open={open} title="Lana OS" onClose={onClose}>
      <SheetGroup label="Lists">
        <SheetAction label="New list" onClick={onNewList} />
        <SheetAction label="Reorder lists" onClick={onReorderLists} />
        <SheetAction
          label="Clear completed"
          hint={
            completedCount === 0
              ? 'Nothing completed'
              : `${completedCount} task${completedCount === 1 ? '' : 's'}`
          }
          disabled={completedCount === 0}
          onClick={onClearCompleted}
        />
      </SheetGroup>

      <SheetGroup label="App">
        <SheetAction
          label="Recently deleted"
          hint={trashCount === 0 ? 'Empty' : `${trashCount} item${trashCount === 1 ? '' : 's'}`}
          onClick={onOpenTrash}
        />
        <SheetAction
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        />
        <SheetAction label="Settings" onClick={onOpenSettings} />
      </SheetGroup>
    </Sheet>
  )
}
