/**
 * Compare x-app-pass header to APP_PASSCODE.
 * When APP_PASSCODE is unset, allow (local / unset deploy).
 */
export function assertPasscode(
  headerValue: string | string[] | undefined,
  env: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; status: number; message: string } {
  const expected = env.APP_PASSCODE?.trim()
  if (!expected) return { ok: true }

  const provided = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }
  return { ok: true }
}
