import * as zip from "@zip.js/zip.js"
import * as Effect from "effect/Effect"
import { assert, describe, test } from "vite-plus/test"
import { SCRATCHPAD_SEED } from "../../../src/features/scratchpad/seed.ts"
import {
  downloadScratchpad,
  shareSourceFromSnapshot,
} from "../../../src/features/scratchpad/share.ts"
import { makeMemoryWorkspace } from "../../../src/features/scratchpad/workspace.ts"

/** Every file entry in the zip, path → text. */
const readZip = async (blob: Blob) => {
  const reader = new zip.ZipReader(new zip.BlobReader(blob))
  const entries: Record<string, string> = {}
  for (const entry of await reader.getEntries()) {
    if (entry.directory) continue
    entries[entry.filename] = await entry.getData!(new zip.TextWriter())
  }
  await reader.close()
  return entries
}

const EDIT = 'export const edited = "yes"\n'
const LOCKFILE = "lockfileVersion: '9.0'\n"

describe("downloadScratchpad", () => {
  test("zips the shared files under a folder named after the Workspace", async () => {
    const download = await Effect.gen(function* () {
      const workspace = yield* makeMemoryWorkspace({
        initialFiles: SCRATCHPAD_SEED.files,
      })
      yield* workspace.writeFile("src/main.ts", EDIT)
      yield* workspace.createFile("src/extra/new.ts", "export {}\n")
      yield* workspace.writeHostFile("pnpm-lock.yaml", LOCKFILE)
      const snapshot = yield* workspace.snapshot
      return yield* downloadScratchpad(
        shareSourceFromSnapshot(snapshot, SCRATCHPAD_SEED.metadata),
      )
    }).pipe(Effect.runPromise)

    const name = SCRATCHPAD_SEED.metadata!.name
    assert.equal(download.name, `${name}.zip`)

    const expected: Record<string, string> = {}
    for (const [path, content] of Object.entries({
      ...SCRATCHPAD_SEED.files,
      "src/main.ts": EDIT,
      "src/extra/new.ts": "export {}\n",
      "pnpm-lock.yaml": LOCKFILE,
    })) {
      expected[`${name}/${path}`] = content
    }
    assert.deepStrictEqual(await readZip(download.content), expected)
  })
})
