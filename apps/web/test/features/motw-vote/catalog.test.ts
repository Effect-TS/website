import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Catalog from "../../../src/features/motw-vote/catalog.ts"
import { VOTE_DATA_PATH } from "../../../src/features/motw-vote/domain.ts"
import { coveredModuleIds } from "../../../src/features/motw-vote/vote-data.ts"
import type { ModulePost } from "../../../src/features/module-of-the-week/domain.ts"

const post = (apiModules?: ReadonlyArray<string>) =>
  ({ data: { apiModules } }) as unknown as ModulePost

test("covered modules are the posts' frontmatter, without repeats", () => {
  assert.deepEqual(
    coveredModuleIds([
      post(["effect/RcMap"]),
      post(["effect/cluster/Entity", "effect/cluster/ClusterSchema"]),
      post(["effect/cluster/Entity"]),
      post(),
    ]),
    ["effect/RcMap", "effect/cluster/Entity", "effect/cluster/ClusterSchema"],
  )
  assert.deepEqual(coveredModuleIds([]), [])
})

const data = {
  modules: ["effect/RcMap", "effect/Pool", "effect/Stream"],
  covered: ["effect/RcMap"],
}

test("the catalog tells votable, covered and unknown modules apart, from one read", async () => {
  const paths: Array<string> = []
  const layer = Catalog.layer(async (path) => {
    paths.push(path)
    return Response.json(data)
  })
  const statuses = await Effect.runPromise(
    Effect.gen(function* () {
      const catalog = yield* Catalog.ModuleCatalog
      return yield* Effect.forEach(
        ["effect/Pool", "effect/RcMap", "other/Module"],
        catalog.status,
      )
    }).pipe(Effect.provide(layer)),
  )
  assert.deepEqual(statuses, ["votable", "covered", "unknown"])
  assert.deepEqual(paths, [VOTE_DATA_PATH])
})

test("reads the catalog again after a failed read", async () => {
  let reads = 0
  const layer = Catalog.layer(async () => {
    reads += 1
    return reads === 1
      ? new Response("down", { status: 503 })
      : Response.json(data)
  })
  const retry = await Effect.runPromise(
    Effect.gen(function* () {
      const catalog = yield* Catalog.ModuleCatalog
      const first = yield* Effect.exit(catalog.status("effect/Pool"))
      const second = yield* catalog.status("effect/Pool")
      const third = yield* catalog.status("effect/Stream")
      return { failed: first._tag === "Failure", second, third }
    }).pipe(Effect.provide(layer)),
  )
  assert.deepEqual(retry, { failed: true, second: "votable", third: "votable" })
  assert.equal(reads, 2)
})
