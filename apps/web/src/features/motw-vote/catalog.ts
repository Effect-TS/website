import * as Cache from "effect/Cache"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { VOTE_DATA_PATH } from "./domain"

/** What the server needs to check a vote, written at build time. */
export const MotwVoteData = Schema.Struct({
  /** Ids of every API module. */
  modules: Schema.Array(Schema.String),
  /** Ids of the API modules the series covered, so they cannot be voted for. */
  covered: Schema.Array(Schema.String),
})

export type MotwVoteData = typeof MotwVoteData.Type

export class CatalogError extends Data.TaggedError("CatalogError")<{
  readonly cause: unknown
}> {}

export type ModuleStatus = "votable" | "covered" | "unknown"

/** Which API modules people can vote for. */
export class ModuleCatalog extends Context.Service<
  ModuleCatalog,
  {
    readonly status: (id: string) => Effect.Effect<ModuleStatus, CatalogError>
  }
>()("website/ModuleCatalog") {}

const KEY = "catalog"

/**
 * A catalog that reads its data through `load`. A read that succeeds is kept
 * for good. A read that fails is not kept, so the next call reads again.
 */
export const memoized = <E>(load: Effect.Effect<MotwVoteData, E>) =>
  Effect.gen(function* () {
    const cache = yield* Cache.makeWith(
      () =>
        load.pipe(
          Effect.map(({ modules, covered }) => ({
            modules: new Set(modules),
            covered: new Set(covered),
          })),
          Effect.mapError((cause) => new CatalogError({ cause })),
        ),
      {
        capacity: 1,
        timeToLive: (exit) =>
          Exit.isSuccess(exit) ? Duration.infinity : Duration.zero,
      },
    )
    return ModuleCatalog.of({
      status: (id) =>
        Cache.get(cache, KEY).pipe(
          Effect.map(({ modules, covered }) =>
            covered.has(id)
              ? "covered"
              : modules.has(id)
                ? "votable"
                : "unknown",
          ),
        ),
    })
  })

/**
 * The catalog the build wrote to `VOTE_DATA_PATH`, read through the
 * `HttpClient`, which must resolve that path to a URL.
 */
export const layer: Layer.Layer<ModuleCatalog, never, HttpClient.HttpClient> =
  Layer.effect(
    ModuleCatalog,
    Effect.gen(function* () {
      const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient)
      return yield* memoized(
        client
          .get(VOTE_DATA_PATH)
          .pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(MotwVoteData)),
          ),
      )
    }),
  )
