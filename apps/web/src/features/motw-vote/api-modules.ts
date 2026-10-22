import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Order from "effect/Order"
import * as Record from "effect/Record"
import { type ModuleRef, toModuleRef } from "./domain"

export class ApiContentError extends Data.TaggedError("ApiContentError")<{
  readonly cause: unknown
}> {}

export interface ApiModuleEntry {
  readonly packageSlug: string
  readonly packageName: string
  readonly modulePath: string
}

/** Where the API reference modules come from. Astro provides the live layer. */
export class ApiReferenceContent extends Context.Service<
  ApiReferenceContent,
  {
    readonly entries: Effect.Effect<
      ReadonlyArray<ApiModuleEntry>,
      ApiContentError
    >
  }
>()("website/ApiReferenceContent") {}

export interface ApiModuleIndex {
  readonly ids: ReadonlyArray<string>
  /** The name of each package, by the slug its module ids start with. */
  readonly packages: Readonly<Record<string, string>>
}

const byNameThenPackage = Order.combine(
  Order.mapInput(Order.String, (module: ModuleRef) => module.name),
  Order.mapInput(Order.String, (module: ModuleRef) => module.pkg),
)

export class ApiModules extends Context.Service<ApiModules>()(
  "website/ApiModules",
  {
    make: Effect.gen(function* () {
      const content = yield* ApiReferenceContent

      const index = Effect.map(content.entries, (entries): ApiModuleIndex => {
        const packages = Record.fromEntries(
          Array.map(entries, (entry) => [entry.packageSlug, entry.packageName]),
        )
        const ids = pipe(
          entries,
          Array.map(({ packageSlug, modulePath }) =>
            toModuleRef(packages)(`${packageSlug}/${modulePath}`),
          ),
          Array.sort(byNameThenPackage),
          Array.map(({ id }) => id),
        )
        return { ids, packages }
      })

      return { index } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
