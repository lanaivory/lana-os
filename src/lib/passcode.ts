const PASSCODE_KEY = 'lana-os:passcode'

export function loadPasscode(): string | null {
  try {
    const value = localStorage.getItem(PASSCODE_KEY)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

export function savePasscode(passcode: string): void {
  localStorage.setItem(PASSCODE_KEY, passcode.trim())
}

export function clearPasscode(): void {
  localStorage.removeItem(PASSCODE_KEY)
}
