import { assert, test } from "vite-plus/test"
import {
  compareVersions,
  resolveLatestRelease,
} from "../../../src/features/changelog/resolve-latest.ts"

const releases = [
  { version: "4.0.7", date: "2026-10-28" },
  { version: "4.0.6", date: "2026-10-22" },
  { version: "4.0.0-rc.1", date: "2026-09-01" },
]

const npm = (latest: string, dates: Record<string, string>) => ({
  latest,
  dates: new Map(Object.entries(dates)),
})

test("orders versions numerically and prereleases first", () => {
  assert.isAbove(compareVersions("4.0.10", "4.0.9"), 0)
  assert.isBelow(compareVersions("4.0.0-rc.2", "4.0.0"), 0)
  assert.isBelow(compareVersions("4.0.0-rc.2", "4.0.0-rc.10"), 0)
  assert.strictEqual(compareVersions("4.0.0", "4.0.0"), 0)
})

test("without npm data it shows the snapshot", () => {
  assert.deepEqual(
    resolveLatestRelease({
      name: "effect",
      snapshot: { version: "4.0.7", date: "2026-10-28" },
      releases: [],
      npm: undefined,
    }),
    { name: "effect", version: "4.0.7", date: "2026-10-28" },
  )
})

test("uses the npm date for the version npm serves", () => {
  assert.deepEqual(
    resolveLatestRelease({
      name: "effect",
      snapshot: { version: "4.0.7", date: "2026-10-28" },
      releases,
      npm: npm("4.0.7", { "4.0.7": "2026-10-29" }),
    }),
    { name: "effect", version: "4.0.7", date: "2026-10-29" },
  )
})

test("hides a snapshot version that npm does not serve yet", () => {
  assert.deepEqual(
    resolveLatestRelease({
      name: "effect",
      snapshot: { version: "4.0.7", date: "2026-10-28" },
      releases,
      npm: npm("4.0.6", { "4.0.6": "2026-10-22" }),
    }),
    { name: "effect", version: "4.0.6", date: "2026-10-22" },
  )
})

test("keeps the newest changelog release when npm is ahead of the snapshot", () => {
  assert.deepEqual(
    resolveLatestRelease({
      name: "effect",
      snapshot: { version: "4.0.7", date: "2026-10-28" },
      releases,
      npm: npm("4.0.8", { "4.0.8": "2026-11-02", "4.0.7": "2026-10-28" }),
    }),
    { name: "effect", version: "4.0.7", date: "2026-10-28" },
  )
})

test("falls back to the tag date when npm lacks the date", () => {
  assert.deepEqual(
    resolveLatestRelease({
      name: "effect",
      snapshot: { version: "4.0.7", date: "2026-10-28" },
      releases,
      npm: npm("4.0.7", {}),
    }),
    { name: "effect", version: "4.0.7", date: "2026-10-28" },
  )
})

test("shows nothing when no changelog release is served", () => {
  assert.isNull(
    resolveLatestRelease({
      name: "effect",
      snapshot: { version: "4.0.7" },
      releases,
      npm: npm("3.0.0", {}),
    }),
  )
})
