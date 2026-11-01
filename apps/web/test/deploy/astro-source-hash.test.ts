import { assert, test } from "vite-plus/test"
import * as NodeServices from "@effect/platform-node/NodeServices"
import AstroSource, {
  type SourceContext,
  type SourceHash,
} from "@alchemy.run/frontend-frameworks/astro/source"
import * as Effect from "effect/Effect"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

// A preview's state records the workspaces its last build imported, and the
// next deploy hashes them again before deciding whether to rebuild. One that
// has since moved, as the course did, must count as a change rather than fail
// the deploy. The pinned provider is patched for this in
// patches/@alchemy.run__frontend-frameworks.patch.

const context: SourceContext = {
  id: "WebsiteWorker",
  workerName: "effectwebsite-websiteworker-pr-1",
  compatibility: { date: "2026-01-01", flags: [] },
  stack: { name: "EffectWebsite", stage: "pr-1" },
  env: undefined,
  assets: undefined,
}

const inputHash = (rootDir: string, additionalWorkspaces: Array<string>) =>
  Effect.gen(function* () {
    const source = yield* AstroSource.make({ rootDir })
    const previous: SourceHash = {
      bundle: undefined,
      assets: undefined,
      input: undefined,
      additionalWorkspaces,
    }
    return (yield* source.hash(context, previous)).input
  }).pipe(Effect.provide(NodeServices.layer), Effect.runPromise)

test("a workspace recorded by the last deploy that no longer exists changes the input hash", async () => {
  const root = await mkdtemp(join(tmpdir(), "astro-source-"))
  try {
    await mkdir(join(root, "app", "src"), { recursive: true })
    await writeFile(join(root, "app", "src", "index.ts"), "export {}\n")
    const app = join(root, "app")

    const withoutRecorded = await inputHash(app, [])
    const withMoved = await inputHash(app, ["../moved-course"])

    assert.isString(withMoved)
    assert.notStrictEqual(withMoved, withoutRecorded)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
