import { assert, describe, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { ModuleContent } from "../../../src/features/module-of-the-week/content.ts"
import type { ModulePost } from "../../../src/features/module-of-the-week/domain.ts"
import { Modules } from "../../../src/features/module-of-the-week/service.ts"
import {
  ApiModules,
  ApiReferenceContent,
  type ApiModuleEntry,
} from "../../../src/features/motw-vote/api-modules.ts"
import {
  UnknownCoveredModules,
  VoteData,
} from "../../../src/features/motw-vote/vote-data.ts"

const entry = (
  packageSlug: string,
  modulePath: string,
  packageName = packageSlug === "effect" ? "effect" : `@effect/${packageSlug}`,
): ApiModuleEntry => ({ packageSlug, packageName, modulePath })

const post = (day: number, apiModules?: ReadonlyArray<string>) =>
  ({
    id: `module-of-the-week/${day}`,
    data: {
      title: `Module of the Week - Post ${day}`,
      date: new Date(2026, 0, day),
      apiModules,
    },
  }) as unknown as ModulePost

const layer = (
  entries: ReadonlyArray<ApiModuleEntry>,
  posts: ReadonlyArray<ModulePost>,
) =>
  VoteData.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        ApiModules.layer.pipe(
          Layer.provide(
            Layer.succeed(ApiReferenceContent, {
              entries: Effect.succeed(entries),
            }),
          ),
        ),
        Modules.layer.pipe(
          Layer.provide(
            Layer.succeed(ModuleContent, {
              posts: Effect.succeed(posts),
              intro: Effect.succeed(Option.none()),
            }),
          ),
        ),
      ),
    ),
  )

const entries = [
  entry("effect", "unstable/Schedule"),
  entry("effect", "Schedule"),
  entry("sql-d1", "D1Client"),
  entry("effect", "cluster/Entity"),
]

describe("ApiModules", () => {
  test("sorts ids by name, then package, and names each package by slug", () =>
    Effect.runPromise(
      ApiModules.use((apiModules) => apiModules.index).pipe(
        Effect.provide(
          ApiModules.layer.pipe(
            Layer.provide(
              Layer.succeed(ApiReferenceContent, {
                entries: Effect.succeed(entries),
              }),
            ),
          ),
        ),
        Effect.map((index) => {
          assert.deepEqual(index.ids, [
            "sql-d1/D1Client",
            "effect/cluster/Entity",
            "effect/Schedule",
            "effect/unstable/Schedule",
          ])
          assert.deepEqual(index.packages, {
            effect: "effect",
            "sql-d1": "@effect/sql-d1",
          })
        }),
      ),
    ))
})

describe("VoteData", () => {
  test("covers the modules the posts name, once each", () =>
    Effect.runPromise(
      VoteData.use((voteData) => voteData.snapshot).pipe(
        Effect.provide(
          layer(entries, [
            post(1, ["effect/Schedule"]),
            post(2, ["effect/cluster/Entity", "effect/Schedule"]),
            post(3),
          ]),
        ),
        Effect.map((snapshot) => {
          assert.sameMembers(
            [...snapshot.covered],
            ["effect/Schedule", "effect/cluster/Entity"],
          )
          assert.equal(snapshot.ids.length, 4)
        }),
      ),
    ))

  test("what the server checks votes against is the ids and the covered ids", () =>
    Effect.runPromise(
      VoteData.use((voteData) => voteData.data).pipe(
        Effect.provide(layer(entries, [post(1, ["effect/Schedule"])])),
        Effect.map((data) =>
          assert.deepEqual(data, {
            modules: [
              "sql-d1/D1Client",
              "effect/cluster/Entity",
              "effect/Schedule",
              "effect/unstable/Schedule",
            ],
            covered: ["effect/Schedule"],
          }),
        ),
      ),
    ))

  test("a covered id that is not an API module fails the build", () =>
    Effect.runPromise(
      VoteData.use((voteData) => voteData.snapshot).pipe(
        Effect.flip,
        Effect.provide(layer(entries, [post(1, ["effect/Shedule"])])),
        Effect.map((error) => {
          assert.instanceOf(error, UnknownCoveredModules)
          assert.deepEqual((error as UnknownCoveredModules).ids, [
            "effect/Shedule",
          ])
        }),
      ),
    ))

  test("covered ids are not checked when there is no API reference", () =>
    Effect.runPromise(
      VoteData.use((voteData) => voteData.snapshot).pipe(
        Effect.provide(layer([], [post(1, ["effect/Anything"])])),
        Effect.map((snapshot) =>
          assert.deepEqual(snapshot.covered, ["effect/Anything"]),
        ),
      ),
    ))
})
