import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { getApiModules } from "./api-modules"

export class CatalogError extends Data.TaggedError("CatalogError")<{
  readonly cause: unknown
}> {}

/** The modules people can vote for. */
export class ModuleCatalog extends Context.Service<
  ModuleCatalog,
  {
    readonly has: (id: string) => Effect.Effect<boolean, CatalogError>
  }
>()("website/ModuleCatalog") {}

/** The modules of the API reference. */
export const apiReferenceLayer = Layer.sync(ModuleCatalog, () => {
  const ids = Effect.tryPromise({
    try: async () => new Set((await getApiModules()).map(({ id }) => id)),
    catch: (cause) => new CatalogError({ cause }),
  }).pipe(Effect.cached, Effect.runSync)

  return { has: (id) => Effect.map(ids, (known) => known.has(id)) }
})
