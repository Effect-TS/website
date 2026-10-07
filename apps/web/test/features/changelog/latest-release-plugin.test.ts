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

function setup(files: Record<string, unknown>) {
  const base = mkdtempSync(join(tmpdir(), "latest-release-"))
  directories.push(base)
  for (const [path, value] of Object.entries(files)) {
    mkdirSync(join(base, path, ".."), { recursive: true })
    writeFileSync(join(base, path), JSON.stringify(value))
  }
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

const changelog = (revision: string) => ({
  schemaVersion: 1,
  channel: "v4",
  name: "effect",
  slug: "effect",
  packageVersion: "4.0.0",
  revision,
  sourceUrl: "https://example.com",
  releases: [
    { version: "4.0.1", date: "2026-10-04", breaking: false, body: "" },
    { version: "4.0.0", date: "2026-10-01", breaking: false, body: "" },
  ],
})

test("exposes the release the API reference shows, not the newest changelog entry", async () => {
  const { load, watched } = setup({
    "v4/manifest.json": { revision: "abc" },
    "v4/changelog/effect.json": changelog("abc"),
  })
  assert.strictEqual(
    await load(),
    'export default {"name":"effect","version":"4.0.0","date":"2026-10-01"}',
  )
  assert.lengthOf(watched, 1)
})

test("exports null without changelog data", async () => {
  const { load } = setup({ "v4/manifest.json": { revision: "abc" } })
  assert.strictEqual(await load(), "export default null")
})

test("fails when the changelog and the API reference disagree", async () => {
  const { load } = setup({
    "v4/manifest.json": { revision: "abc" },
    "v4/changelog/effect.json": changelog("def"),
  })
  let failure: unknown
  await load().catch((error: unknown) => {
    failure = error
  })
  assert.match(String(failure), /generate them together/)
})
