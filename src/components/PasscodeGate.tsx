import { useState, type FormEvent, type ReactNode } from 'react'
import { loadPasscode, savePasscode } from '../lib/passcode'

type Props = {
  children: ReactNode
}

/**
 * Lightweight single-user gate. Remembers passcode in localStorage
 * and unlocks the app for this browser.
 */
export function PasscodeGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(() => Boolean(loadPasscode()))
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  if (unlocked) return <>{children}</>

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Enter your passcode')
      return
    }
    savePasscode(trimmed)
    setUnlocked(true)
  }

  return (
    <div className="passgate">
      <form className="passgate__card" onSubmit={onSubmit}>
        <p className="passgate__brand">Lana OS</p>
        <h1 className="passgate__title">Enter passcode</h1>
        <p className="passgate__hint">
          Unlocks this device and authorizes cloud sync.
        </p>
        <input
          className="passgate__input"
          type="password"
          name="passcode"
          autoComplete="current-password"
          placeholder="Passcode"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          autoFocus
        />
        {error && <p className="passgate__error">{error}</p>}
        <button type="submit" className="passgate__btn">
          Unlock
        </button>
      </form>
    </div>
  )
}
