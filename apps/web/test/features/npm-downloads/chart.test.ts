import { assert, test } from "vite-plus/test"
import { downloadsChart } from "../../../src/features/npm-downloads/chart.ts"

const weeks = [
  { weekStart: "2024-04-15", downloads: 245_399 },
  { weekStart: "2026-09-28", downloads: 51_260_000 },
]

test("labels the latest week with its exact date range", () => {
  const chart = downloadsChart(weeks)
  assert.equal(chart.latest.value, "51.3M")
  assert.equal(
    chart.latest.label.replace(/\s/g, " "),
    "Last complete week reported by npm, Sep 28 – Oct 4, 2026",
  )
})

test("computes growth from the first to the latest week", () => {
  assert.equal(downloadsChart(weeks).growth.value, "209×")
})

test("describes the series for assistive technology", () => {
  assert.equal(
    downloadsChart(weeks).description,
    "Weekly downloads of the effect package grew from 245,399 in the week of April 15, 2024 to 51,260,000 in the week of September 28, 2026.",
  )
})

test("rejects an empty series", () => {
  assert.throws(() => downloadsChart([]))
})
