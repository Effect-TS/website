import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { VOTE_DATA_PATH } from "./domain"
import type { MotwVoteData } from "./vote-data"

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

/**
 * The catalog the build wrote to `VOTE_DATA_PATH`, read through `readAsset`.
 * It is read once, and again after a failed read.
 */
export const layer = (readAsset: (path: string) => Promise<Response>) =>
  Layer.sync(ModuleCatalog, () => {
    let loaded:
      | Promise<{ modules: Set<string>; covered: Set<string> }>
      | undefined

    const load = () =>
      (loaded ??= readAsset(VOTE_DATA_PATH)
        .then(async (response) => {
          if (!response.ok)
            throw new Error(`${VOTE_DATA_PATH} answered ${response.status}`)
          const data = (await response.json()) as MotwVoteData
          return {
            modules: new Set(data.modules),
            covered: new Set(data.covered),
          }
        })
        .catch((error: unknown) => {
          loaded = undefined
          throw error
        }))

    return {
      status: (id) =>
        Effect.tryPromise({
          try: load,
          catch: (cause) => new CatalogError({ cause }),
        }).pipe(
          Effect.map(({ modules, covered }) =>
            covered.has(id)
              ? "covered"
              : modules.has(id)
                ? "votable"
                : "unknown",
          ),
        ),
    }
  })
