import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Order from "effect/Order"
import * as Record from "effect/Record"
import { Modules } from "@/features/module-of-the-week/service"
import type { MotwVoteData } from "./catalog"
import { type ModuleRef, toModuleRef } from "./domain"

export class ApiContentError extends Data.TaggedError("ApiContentError")<{
  readonly cause: unknown
}> {}

export class UnknownCoveredModules extends Data.TaggedError(
  "UnknownCoveredModules",
)<{
  readonly ids: ReadonlyArray<string>
}> {
  override get message(): string {
    return `apiModules names modules missing from the API reference: ${this.ids.join(", ")}`
  }
}

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

const byNameThenPackage = Order.combine(
  Order.mapInput(Order.String, (module: ModuleRef) => module.name),
  Order.mapInput(Order.String, (module: ModuleRef) => module.pkg),
)

export class VoteData extends Context.Service<VoteData>()("website/VoteData", {
  make: Effect.gen(function* () {
    const modules = yield* Modules
    const content = yield* ApiReferenceContent

    const index = Effect.map(content.entries, (entries) => {
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

    /** The API modules the posts name in their `apiModules` frontmatter. */
    const covered = Effect.map(modules.latest, (latest) =>
      pipe(
        latest,
        Array.flatMap(({ post }) => post.data.apiModules ?? []),
        Array.dedupe,
      ),
    )

    const snapshot = Effect.gen(function* () {
      const all = yield* Effect.all(
        { index, covered },
        { concurrency: "unbounded" },
      )
      // A misspelled id would leave a covered module votable. Skipped when the
      // API reference is missing, as in a checkout that never generated it.
      const known = new Set(all.index.ids)
      const unknown = Array.filter(all.covered, (id) => !known.has(id))
      if (known.size > 0 && Array.isReadonlyArrayNonEmpty(unknown)) {
        return yield* new UnknownCoveredModules({ ids: unknown })
      }
      return { ...all.index, covered: all.covered }
    })

    const data = Effect.map(snapshot, ({ ids, covered }): MotwVoteData => ({
      modules: ids,
      covered,
    }))

    return { snapshot, data } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
