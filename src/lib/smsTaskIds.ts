/**
 * Deterministic task ids for SMS-captured to-dos.
 * Server push and client inbox capture must agree so notification deep-links work.
 */
export function smsTaskId(messageSid: string, index: number): string {
  const sid = messageSid.trim().replace(/[^A-Za-z0-9_-]/g, '')
  if (!sid) return `sms_unknown_${index}`
  return `sms_${sid}_${index}`
}
