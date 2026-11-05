import type { WeeklyDownloads } from "./domain"
import { DAY } from "./weeks"

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const longDate = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const shortRange = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

/** What a trend chart shows for a series of weekly downloads. */
export interface DownloadsChart {
  readonly data: ReadonlyArray<readonly [weekStart: string, downloads: number]>
  readonly latest: { readonly value: string; readonly label: string }
  readonly growth: { readonly value: string; readonly label: string }
  readonly description: string
}

export const downloadsChart = (
  weeks: ReadonlyArray<WeeklyDownloads>,
): DownloadsChart => {
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  if (first === undefined || last === undefined) {
    throw new Error("downloadsChart needs at least one week")
  }
  const lastStart = new Date(last.weekStart)
  const lastEnd = new Date(Date.parse(last.weekStart) + 6 * DAY)
  return {
    data: weeks.map((week) => [week.weekStart, week.downloads] as const),
    latest: {
      value: compact.format(last.downloads),
      label: `Last complete week reported by npm, ${shortRange.formatRange(lastStart, lastEnd)}`,
    },
    growth: {
      value: `${Math.round(last.downloads / first.downloads)}×`,
      label: "Growth since 3.x",
    },
    description: `Weekly downloads of the effect package grew from ${first.downloads.toLocaleString("en")} in the week of ${longDate.format(new Date(first.weekStart))} to ${last.downloads.toLocaleString("en")} in the week of ${longDate.format(lastStart)}.`,
  }
}
