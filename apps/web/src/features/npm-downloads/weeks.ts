import type { DailyDownloads, WeeklyDownloads } from "./domain"

export const DAY = 24 * 60 * 60 * 1000

export const isoDate = (time: number) =>
  new Date(time).toISOString().slice(0, 10)

/** Midnight UTC of the most recent Sunday that is before `now`'s day. */
export const lastCompleteSunday = (now: Date) => {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  return today - (new Date(today).getUTCDay() || 7) * DAY
}

/** Splits `from..to` (inclusive) into windows of at most `chunkDays` days. */
export const dateRanges = (from: number, to: number, chunkDays: number) => {
  const ranges: Array<{ readonly from: number; readonly to: number }> = []
  for (let start = from; start <= to; start += chunkDays * DAY) {
    ranges.push({
      from: start,
      to: Math.min(start + (chunkDays - 1) * DAY, to),
    })
  }
  return ranges
}

const mondayOf = (time: number) =>
  time - ((new Date(time).getUTCDay() + 6) % 7) * DAY

/**
 * Sums days into Monday-to-Sunday weeks, oldest first. A week with a missing
 * day (reported as `0`) is dropped: its total would be a false drop.
 */
export const toWeeklyDownloads = (
  daily: ReadonlyArray<DailyDownloads>,
): ReadonlyArray<WeeklyDownloads> => {
  const weeks = new Map<string, { downloads: number; complete: boolean }>()
  for (const { day, downloads } of daily) {
    const weekStart = isoDate(mondayOf(Date.parse(day)))
    const week = weeks.get(weekStart) ?? { downloads: 0, complete: true }
    week.downloads += downloads
    if (downloads === 0) week.complete = false
    weeks.set(weekStart, week)
  }
  return [...weeks]
    .filter(([, week]) => week.complete)
    .map(([weekStart, week]) => ({ weekStart, downloads: week.downloads }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
