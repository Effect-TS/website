import { stringify } from "devalue"
import * as NodeFs from "node:fs/promises"
import * as NodeOs from "node:os"
import * as NodePath from "node:path"
import { pathToFileURL } from "node:url"
import { assert, test } from "vite-plus/test"
import { openGraphMetadataPlugin } from "../../../src/features/open-graph/plugin.ts"

const VIRTUAL_ID = "\0virtual:open-graph-metadata"

/**
 * Astro's content layer writes `data-store.json` into the configured
 * `cacheDir`. The plugin used to hardcode the default (`node_modules/.astro`),
 * which broke the moment the config moved it — and only on a clean checkout,
 * where no store was left behind at the old location.
 */
const loadFrom = (cacheDir: URL) => {
  const plugin = openGraphMetadataPlugin({ cacheDir })
  const load = plugin.load as (this: unknown, id: string) => Promise<unknown>
  return load.call(
    { environment: { mode: "build" }, addWatchFile: () => {} },
    VIRTUAL_ID,
  )
}

const emptyStore = stringify(
  new Map<string, unknown>([
    ["docs", new Map()],
    ["blog", new Map()],
    ["apiReference", new Map()],
  ]),
)

test("reads the content store from the configured cacheDir", async () => {
  const dir = await NodeFs.mkdtemp(NodePath.join(NodeOs.tmpdir(), "og-"))
  await NodeFs.writeFile(NodePath.join(dir, "data-store.json"), emptyStore)

  const result = await loadFrom(pathToFileURL(`${dir}/`))

  assert.equal(
    result,
    `export default ${JSON.stringify({ apiReference: {}, blog: {}, docs: {} })}`,
  )
  await NodeFs.rm(dir, { recursive: true, force: true })
})

test("reports the cacheDir-relative path when the store is missing", async () => {
  const dir = await NodeFs.mkdtemp(NodePath.join(NodeOs.tmpdir(), "og-"))
  const expected = NodePath.join(dir, "data-store.json")

  const error = await loadFrom(pathToFileURL(`${dir}/`)).then(
    () => undefined,
    (cause: unknown) => cause,
  )

  assert.ok(error instanceof Error, "expected the missing store to fail")
  assert.include(error.message, expected)
  await NodeFs.rm(dir, { recursive: true, force: true })
})
