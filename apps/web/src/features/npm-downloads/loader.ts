import type { Loader } from "astro/loaders"

const DAY = 24 * 60 * 60 * 1000
// The range endpoint rejects windows longer than 18 months.
const CHUNK_DAYS = 500
const ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10)

interface DailyDownloads {
  readonly day: string
  readonly downloads: number
}

async function fetchDailyDownloads(
  packageName: string,
  from: number,
  to: number,
): Promise<ReadonlyArray<DailyDownloads>> {
  const url = `https://api.npmjs.org/downloads/range/${isoDate(from)}:${isoDate(to)}/${packageName}`
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok)
        throw new Error(
          `npm downloads request failed (${response.status}): ${url}`,
        )
      return (
        (await response.json()) as { downloads: ReadonlyArray<DailyDownloads> }
      ).downloads
    } catch (error) {
      if (attempt === ATTEMPTS) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * 2 ** (attempt - 1)),
      )
    }
  }
}

/**
 * One entry per Monday-to-Sunday week, from `from` (a Monday) to the last
 * complete week. npm reports a missing day as `0`, so weeks containing one
 * are skipped instead of shown as a false drop. Requests are retried; if they
 * still fail, the previous store is kept (the build only fails with no data).
 */
export function npmDownloadsLoader(options: {
  readonly packageName: string
  readonly from: string
}): Loader {
  return {
    name: "npm-downloads-loader",
    load: async ({ generateDigest, logger, parseData, store }) => {
      const now = new Date()
      const today = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      )
      const lastSunday = today - (new Date(today).getUTCDay() || 7) * DAY

      const start = Date.parse(options.from)
      const requests: Array<Promise<ReadonlyArray<DailyDownloads>>> = []
      for (
        let chunkStart = start;
        chunkStart <= lastSunday;
        chunkStart += CHUNK_DAYS * DAY
      ) {
        const chunkEnd = Math.min(
          chunkStart + (CHUNK_DAYS - 1) * DAY,
          lastSunday,
        )
        requests.push(
          fetchDailyDownloads(options.packageName, chunkStart, chunkEnd),
        )
      }

      let daily: ReadonlyArray<DailyDownloads>
      try {
        daily = (await Promise.all(requests)).flat()
      } catch (error) {
        if (store.keys().length === 0) throw error
        logger.warn(
          `npm downloads unavailable, keeping the previous data: ${String(error)}`,
        )
        return
      }

      const weeks = new Map<
        string,
        { downloads: number; missingDays: number }
      >()
      for (const { day, downloads } of daily) {
        const time = Date.parse(day)
        const weekStart = isoDate(
          time - ((new Date(time).getUTCDay() + 6) % 7) * DAY,
        )
        const week = weeks.get(weekStart) ?? { downloads: 0, missingDays: 0 }
        week.downloads += downloads
        if (downloads === 0) week.missingDays++
        weeks.set(weekStart, week)
      }

      store.clear()
      let skipped = 0
      for (const [weekStart, week] of weeks) {
        if (week.missingDays > 0) {
          skipped++
          continue
        }
        const data = await parseData({
          id: weekStart,
          data: {
            packageName: options.packageName,
            weekStart,
            downloads: week.downloads,
          },
        })
        store.set({ id: weekStart, data, digest: generateDigest(data) })
      }
      logger.info(
        `Loaded ${store.keys().length} weeks of ${options.packageName} downloads (${skipped} skipped for missing days)`,
      )
    },
  }
}
