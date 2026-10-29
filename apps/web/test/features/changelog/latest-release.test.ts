import { afterEach, assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { LatestRelease } from "../../../src/features/changelog/latest-release.ts"
import { NpmRegistryError } from "../../../src/features/changelog/npm-registry.ts"
import {
  registryLayer,
  removeDatasets,
  served,
  writeDataset,
} from "./dataset-fixture.ts"

afterEach(removeDatasets)

const latest = (
  registry: Layer.Layer<
    import("../../../src/features/changelog/npm-registry.ts").NpmRegistry
  >,
  options: { changelog: boolean } = { changelog: true },
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      return yield* (yield* LatestRelease).latest()
    }).pipe(
      Effect.provide(
        LatestRelease.layerNoDeps(writeDataset(options)).pipe(
          Layer.provide(registry),
        ),
      ),
    ),
  )

test("shows the npm date for the version npm serves", async () => {
  assert.deepEqual(
    await latest(registryLayer(served("4.0.0", { "4.0.0": "2026-10-02" }))),
    { name: "effect", version: "4.0.0", date: "2026-10-02" },
  )
})

test("shows the newest release npm serves when the snapshot is ahead", async () => {
  assert.deepEqual(
    await latest(registryLayer(served("3.9.5", { "3.9.0": "2026-09-02" }))),
    { name: "effect", version: "3.9.0", date: "2026-09-02" },
  )
})

test("falls back to the snapshot when npm fails", async () => {
  assert.deepEqual(
    await latest(
      registryLayer(Effect.fail(new NpmRegistryError({ cause: "down" }))),
    ),
    { name: "effect", version: "4.0.0", date: "2026-10-01" },
  )
})

test("is null when the package has no changelog", async () => {
  assert.isNull(
    await latest(registryLayer(served("4.0.0", {})), { changelog: false }),
  )
})

test("asks npm once while the answer is fresh", async () => {
  let calls = 0
  const registry = registryLayer(
    Effect.suspend(() => {
      calls += 1
      return served("4.0.0", {})
    }),
  )
  await Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* LatestRelease
      yield* service.latest()
      yield* service.latest()
    }).pipe(
      Effect.provide(
        LatestRelease.layerNoDeps(writeDataset({ changelog: true })).pipe(
          Layer.provide(registry),
        ),
      ),
    ),
  )
  assert.strictEqual(calls, 1)
})

test("asks npm again after a failure", async () => {
  let calls = 0
  const registry = registryLayer(
    Effect.suspend(() => {
      calls += 1
      return calls === 1
        ? Effect.fail(new NpmRegistryError({ cause: "down" }))
        : served("4.0.0", { "4.0.0": "2026-10-02" })
    }),
  )
  const results = await Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* LatestRelease
      return [yield* service.latest(), yield* service.latest()]
    }).pipe(
      Effect.provide(
        LatestRelease.layerNoDeps(writeDataset({ changelog: true })).pipe(
          Layer.provide(registry),
        ),
      ),
    ),
  )
  assert.deepEqual(
    results.map((release) => release?.date),
    ["2026-10-01", "2026-10-02"],
  )
})
