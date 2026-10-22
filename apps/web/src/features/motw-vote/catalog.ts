import * as Context from "effect/Context"
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
  modules: Schema.Array(Schema.String),
  /** Ids of the API modules the series covered, so they cannot be voted for. */
  covered: Schema.Array(Schema.String),
})

export type MotwVoteData = typeof MotwVoteData.Type

/** The API modules the posts name in their `apiModules` frontmatter. */
export const coveredModuleIds = (
  posts: ReadonlyArray<{
    readonly data: { readonly apiModules?: ReadonlyArray<string> | undefined }
  }>,
): ReadonlyArray<string> => [
  ...new Set(posts.flatMap((post) => post.data.apiModules ?? [])),
]

export type ModuleStatus = "votable" | "covered" | "unknown"

export class ModuleCatalog extends Context.Service<
  ModuleCatalog,
  { readonly status: (id: string) => Effect.Effect<ModuleStatus> }
>()("motw-vote/ModuleCatalog") {
  /** A read that succeeds is kept for good. A read that fails is not, so the next call reads again. */
  static readonly layerFrom = <E>(load: Effect.Effect<MotwVoteData, E>) =>
    Layer.effect(
      this,
      Effect.gen(function* () {
        const data = yield* Effect.cachedWithTTL(
          load.pipe(
            Effect.map(({ modules, covered }) => ({
              modules: new Set(modules),
              covered: new Set(covered),
            })),
            Effect.orDie,
          ),
          (exit) => (Exit.isSuccess(exit) ? Duration.infinity : Duration.zero),
        )
        return ModuleCatalog.of({
          status: (id) =>
            Effect.map(data, ({ modules, covered }) =>
              covered.has(id)
                ? "covered"
                : modules.has(id)
                  ? "votable"
                  : "unknown",
            ),
        })
      }),
    )

  static readonly layer: Layer.Layer<
    ModuleCatalog,
    never,
    HttpClient.HttpClient
  > = Layer.unwrap(
    Effect.map(HttpClient.HttpClient, (client) =>
      this.layerFrom(
        HttpClient.filterStatusOk(client)
          .get(VOTE_DATA_PATH)
          .pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(MotwVoteData)),
          ),
      ),
    ),
  )
}
