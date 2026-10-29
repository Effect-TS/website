import { afterEach, assert, test } from "vite-plus/test"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import { LatestRelease } from "../../../src/features/changelog/latest-release.ts"
import { latestReleasePlugin } from "../../../src/features/changelog/latest-release-plugin.ts"
import {
  registryLayer,
  removeDatasets,
  served,
  writeDataset,
} from "./dataset-fixture.ts"

afterEach(removeDatasets)

const moduleId = "virtual:latest-release"

function setup(options: { changelog: boolean }) {
  const dataset = writeDataset(options)
  const runtime = ManagedRuntime.make(
    LatestRelease.layerNoDeps(dataset).pipe(
      Layer.provide(registryLayer(served("4.0.0", { "4.0.0": "2026-10-02" }))),
    ),
  )
  const plugin = latestReleasePlugin(runtime)
  const watched: Array<string> = []
  const load = async (id = `\0${moduleId}`) => {
    const loadHook = plugin.load as (
      this: { addWatchFile: (file: string) => void },
      id: string,
    ) => Promise<string | undefined>
    return loadHook.call({ addWatchFile: (file) => watched.push(file) }, id)
  }
  return { plugin, load, watched }
}

test("resolves only its own module id", () => {
  const { plugin } = setup({ changelog: true })
  const resolveId = plugin.resolveId as (id: string) => string | undefined
  assert.strictEqual(resolveId(moduleId), `\0${moduleId}`)
  assert.isUndefined(resolveId("virtual:other"))
})

test("exports the release and watches the dataset manifest", async () => {
  const { load, watched } = setup({ changelog: true })
  assert.strictEqual(
    await load(),
    'export default {"name":"effect","version":"4.0.0","date":"2026-10-02"}',
  )
  assert.lengthOf(watched, 1)
  assert.match(watched[0]!, /v4\/manifest\.json$/)
})

test("exports null when the package has no changelog", async () => {
  const { load } = setup({ changelog: false })
  assert.strictEqual(await load(), "export default null")
})

test("ignores other modules", async () => {
  const { load } = setup({ changelog: true })
  assert.isUndefined(await load("other"))
})
