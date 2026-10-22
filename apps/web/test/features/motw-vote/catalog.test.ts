import { assert, describe, test } from "vite-plus/test"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { ModuleCatalog } from "../../../src/features/motw-vote/catalog.ts"
import { VOTE_DATA_PATH } from "../../../src/features/motw-vote/domain.ts"

const data = {
  modules: ["effect/RcMap", "effect/Pool", "effect/Stream"],
  covered: ["effect/RcMap"],
}

const ORIGIN = "https://assets.invalid"

const served = (answers: ReadonlyArray<() => Response>) => {
  const paths: Array<string> = []
  const client = HttpClient.make((request, url) => {
    paths.push(url.pathname)
    const answer = answers[Math.min(paths.length, answers.length) - 1]
    return Effect.succeed(HttpClientResponse.fromWeb(request, answer()))
  }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl(ORIGIN)))
  return {
    paths,
    layer: Layer.provide(
      ModuleCatalog.layer,
      Layer.succeed(HttpClient.HttpClient, client),
    ),
  }
}

const ok = () => Response.json(data)
const down = () => new Response("down", { status: 503 })
const html = () =>
  new Response("<html>Not found</html>", {
    headers: { "content-type": "text/html" },
  })

const status = (id: string) =>
  ModuleCatalog.use((catalog) => catalog.status(id))

describe("ModuleCatalog", () => {
  test("tells votable, covered and unknown modules apart, from one read", async () => {
    const { paths, layer } = served([ok])
    const statuses = await Effect.runPromise(
      Effect.forEach(
        ["effect/Pool", "effect/RcMap", "other/Module"],
        status,
      ).pipe(Effect.provide(layer)),
    )
    assert.deepEqual(statuses, ["votable", "covered", "unknown"])
    assert.deepEqual(paths, [VOTE_DATA_PATH])
  })

  test("reads once for many calls, even at the same time", async () => {
    const { paths, layer } = served([ok])
    await Effect.runPromise(
      Effect.forEach(
        Array.from({ length: 20 }, () => "effect/Pool"),
        status,
        { concurrency: "unbounded" },
      ).pipe(Effect.provide(layer)),
    )
    assert.equal(paths.length, 1)
  })

  for (const [name, failure] of [
    ["a 503", down],
    ["a 200 with HTML", html],
    ["JSON of another shape", () => Response.json({ modules: "all" })],
  ] as const) {
    test(`${name} is a defect, and the next call reads again`, async () => {
      const { paths, layer } = served([failure, failure, ok])
      const results = await Effect.runPromise(
        Effect.gen(function* () {
          const first = yield* Effect.exit(status("effect/Pool"))
          const second = yield* Effect.exit(status("effect/Pool"))
          const third = yield* status("effect/Pool")
          const fourth = yield* status("effect/RcMap")
          return { first, second, third, fourth }
        }).pipe(Effect.provide(layer)),
      )
      for (const exit of [results.first, results.second])
        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
      assert.equal(results.third, "votable")
      assert.equal(results.fourth, "covered")
      assert.equal(paths.length, 3)
    })
  }
})
