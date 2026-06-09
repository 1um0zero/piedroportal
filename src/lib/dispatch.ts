/**
 * Working-day maths for the expected-dispatch counter.
 *
 * Non-working days = weekends + Portuguese national holidays (computed) + the
 * admin-managed factory_closures. "N days" in settings means N effective working
 * days; the counter shown on /orders is then a plain calendar countdown to that
 * date.
 */

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Easter Sunday (Anonymous Gregorian algorithm). */
function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)

/** Portuguese national public holidays for a year, as ISO date strings. */
export function ptHolidays(year: number): Set<string> {
  const e = easter(year)
  const fixed = ['01-01', '04-25', '05-01', '06-10', '08-15', '10-05', '11-01', '12-01', '12-08', '12-25']
  const out = new Set<string>(fixed.map(md => `${year}-${md}`))
  out.add(iso(addDays(e, -2)))  // Good Friday
  out.add(iso(addDays(e, 60)))  // Corpus Christi
  out.add(iso(e))               // Easter Sunday (also a Sunday)
  return out
}

const holidayCache = new Map<number, Set<string>>()
function holidaysFor(year: number): Set<string> {
  let s = holidayCache.get(year)
  if (!s) { s = ptHolidays(year); holidayCache.set(year, s) }
  return s
}

/** A working day = not a weekend, not a PT holiday, not an admin closure. */
export function isWorkingDay(d: Date, closures: Set<string>): boolean {
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return false
  const key = iso(d)
  if (closures.has(key)) return false
  return !holidaysFor(d.getUTCFullYear()).has(key)
}

/**
 * Add `n` working days to a start date. Counts forward from the day AFTER start
 * (the order day itself doesn't count). Returns an ISO date string.
 */
export function addWorkingDays(startISO: string, n: number, closures: Set<string>): string {
  let d = new Date(`${startISO.slice(0, 10)}T00:00:00Z`)
  let added = 0
  while (added < n) {
    d = addDays(d, 1)
    if (isWorkingDay(d, closures)) added++
  }
  return iso(d)
}

/** Whole calendar days from today (UTC) to the target ISO date (negative = overdue). */
export function daysUntil(targetISO: string | null | undefined): number | null {
  if (!targetISO) return null
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const target = new Date(`${targetISO.slice(0, 10)}T00:00:00Z`)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/** Closures (weekends + PT holidays + factory closures) within the next `days`
 *  working window from today — used to warn the user at order registration. */
export function closuresAhead(closures: Set<string>, days: number): { date: string; reason: 'holiday' | 'closure' }[] {
  const out: { date: string; reason: 'holiday' | 'closure' }[] = []
  let d = new Date(); d.setUTCHours(0, 0, 0, 0)
  for (let i = 0; i < days * 2 + 7 && out.length < 20; i++) {
    d = addDays(d, 1)
    const key = iso(d)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) continue // weekends are expected — don't flag
    if (closures.has(key)) out.push({ date: key, reason: 'closure' })
    else if (holidaysFor(d.getUTCFullYear()).has(key)) out.push({ date: key, reason: 'holiday' })
  }
  return out
}
