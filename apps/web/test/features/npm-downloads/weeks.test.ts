import { assert, test } from "vite-plus/test"
import {
  dateRanges,
  DAY,
  lastCompleteSunday,
  toWeeklyDownloads,
} from "../../../src/features/npm-downloads/weeks.ts"

const day = (date: string, downloads: number) => ({ day: date, downloads })

test("last complete Sunday is the Sunday before the current day", () => {
  // Thursday 2026-10-22 -> Sunday 2026-10-18
  assert.equal(
    lastCompleteSunday(new Date("2026-10-22T14:00:00Z")),
    Date.parse("2026-10-18"),
  )
  // A Sunday is incomplete itself -> the Sunday a week earlier
  assert.equal(
    lastCompleteSunday(new Date("2026-10-25T23:59:00Z")),
    Date.parse("2026-10-18"),
  )
  // Monday -> the Sunday right before it
  assert.equal(
    lastCompleteSunday(new Date("2026-10-26T00:00:00Z")),
    Date.parse("2026-10-25"),
  )
})

test("date ranges cover the span without gaps or overlap", () => {
  const from = Date.parse("2024-04-15")
  const to = Date.parse("2026-10-18")
  const ranges = dateRanges(from, to, 500)
  assert.equal(ranges.length, 2)
  assert.equal(ranges[0]?.from, from)
  assert.equal(ranges.at(-1)?.to, to)
  for (let i = 1; i < ranges.length; i++) {
    assert.equal(ranges[i]!.from, ranges[i - 1]!.to + DAY)
  }
})

test("a single short span is one range", () => {
  const from = Date.parse("2026-10-05")
  assert.deepEqual(dateRanges(from, Date.parse("2026-10-11"), 500), [
    { from, to: Date.parse("2026-10-11") },
  ])
})

test("sums Monday-to-Sunday weeks, oldest first", () => {
  const week = [
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
  ]
  const nextWeek = [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ]
  assert.deepEqual(
    toWeeklyDownloads([
      ...nextWeek.map((date) => day(date, 2)),
      ...week.map((date) => day(date, 1)),
    ]),
    [
      { weekStart: "2026-09-21", downloads: 7 },
      { weekStart: "2026-09-28", downloads: 14 },
    ],
  )
})

test("drops a week with a missing day instead of showing a false drop", () => {
  const dates = [
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
  ]
  assert.deepEqual(
    toWeeklyDownloads(dates.map((date, i) => day(date, i === 1 ? 0 : 5))),
    [],
  )
})
