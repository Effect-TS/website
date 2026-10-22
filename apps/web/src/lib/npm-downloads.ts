const DAY = 24 * 60 * 60 * 1000
// The range endpoint rejects windows longer than 18 months.
const CHUNK_DAYS = 500

export type WeeklyDownloads = ReadonlyArray<
  readonly [weekStart: string, downloads: number]
>

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10)

async function fetchDailyDownloads(
  packageName: string,
  from: number,
  to: number,
) {
  const url = `https://api.npmjs.org/downloads/range/${isoDate(from)}:${isoDate(to)}/${packageName}`
  const response = await fetch(url)
  if (!response.ok)
    throw new Error(`npm downloads request failed (${response.status}): ${url}`)
  const body = (await response.json()) as {
    downloads: ReadonlyArray<{ day: string; downloads: number }>
  }
  return body.downloads
}

/**
 * Weekly (Monday to Sunday) download totals from `from` (a Monday, `YYYY-MM-DD`)
 * up to the last complete week. Requests are split to fit the API window limit.
 */
export async function getWeeklyDownloads(
  packageName: string,
  from: string,
): Promise<WeeklyDownloads> {
  const start = Date.parse(from)
  const today = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  )
  const lastSunday = today - (new Date(today).getUTCDay() || 7) * DAY

  const requests: Array<
    Promise<ReadonlyArray<{ day: string; downloads: number }>>
  > = []
  for (
    let chunkStart = start;
    chunkStart <= lastSunday;
    chunkStart += CHUNK_DAYS * DAY
  ) {
    const chunkEnd = Math.min(chunkStart + (CHUNK_DAYS - 1) * DAY, lastSunday)
    requests.push(fetchDailyDownloads(packageName, chunkStart, chunkEnd))
  }

  const weeks = new Map<string, number>()
  for (const { day, downloads } of (await Promise.all(requests)).flat()) {
    const time = Date.parse(day)
    const weekStart = isoDate(
      time - ((new Date(time).getUTCDay() + 6) % 7) * DAY,
    )
    weeks.set(weekStart, (weeks.get(weekStart) ?? 0) + downloads)
  }
  return [...weeks].sort(([a], [b]) => a.localeCompare(b))
}
