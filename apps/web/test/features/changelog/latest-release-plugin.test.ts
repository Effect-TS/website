import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { afterEach, assert, test } from "vite-plus/test"
import { latestReleasePlugin } from "../../../src/features/changelog/latest-release-plugin.ts"

const directories: Array<string> = []
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

const moduleId = "virtual:latest-release"

const changelog = {
  json: "changelog.json",
  sha256: "a".repeat(64),
  sourceUrl: "https://github.com/Effect-TS/effect/blob/abc/CHANGELOG.md",
  releaseCount: 2,
  latestDate: "2026-10-01",
}

/** Writes the manifests of a v4 dataset that holds `effect`. */
function setup(options: { changelog: boolean }) {
  const base = mkdtempSync(join(tmpdir(), "latest-release-"))
  directories.push(base)
  mkdirSync(join(base, "v4", "effect"), { recursive: true })
  writeFileSync(
    join(base, "v4", "effect", "manifest.json"),
    JSON.stringify({
      schemaVersion: 3,
      channel: "v4",
      name: "effect",
      version: "4.0.0",
      revision: "abc",
      description: "The Effect library",
      npmUrl: "https://www.npmjs.com/package/effect",
      sourceUrl: "https://github.com/Effect-TS/effect/tree/abc/packages/effect",
      barrels: [],
      modules: [],
      ...(options.changelog ? { changelog } : {}),
    }),
  )
  writeFileSync(
    join(base, "v4", "manifest.json"),
    JSON.stringify({
      datasetSchemaVersion: 1,
      channel: "v4",
      typedocVersion: "0.28.20",
      typedocSchemaVersion: "2.0",
      revision: "abc",
      packages: [
        { name: "effect", version: "4.0.0", manifest: "effect/manifest.json" },
      ],
    }),
  )
  const plugin = latestReleasePlugin({
    base: pathToFileURL(`${base}/`),
    channel: "v4",
    slug: "effect",
  })
  const watched: Array<string> = []
  const load = async () => {
    const resolveId = plugin.resolveId as (id: string) => string | undefined
    const resolved = resolveId(moduleId)
    assert.isDefined(resolved)
    const loadHook = plugin.load as (
      this: { addWatchFile: (file: string) => void },
      id: string,
    ) => Promise<string | undefined>
    return loadHook.call(
      { addWatchFile: (file) => watched.push(file) },
      resolved!,
    )
  }
  return { load, watched }
}

test("exposes the version the API reference shows, with its tag date", async () => {
  const { load, watched } = setup({ changelog: true })
  assert.strictEqual(
    await load(),
    'export default {"name":"effect","version":"4.0.0","date":"2026-10-01"}',
  )
  assert.lengthOf(watched, 1)
})

test("exports null when the package has no changelog", async () => {
  const { load } = setup({ changelog: false })
  assert.strictEqual(await load(), "export default null")
})

test("exports null without a dataset", async () => {
  const base = mkdtempSync(join(tmpdir(), "latest-release-"))
  directories.push(base)
  const plugin = latestReleasePlugin({
    base: pathToFileURL(`${base}/`),
    channel: "v4",
    slug: "effect",
  })
  const loadHook = plugin.load as (
    this: { addWatchFile: (file: string) => void },
    id: string,
  ) => Promise<string | undefined>
  assert.strictEqual(
    await loadHook.call({ addWatchFile: () => undefined }, `\0${moduleId}`),
    "export default null",
  )
})
