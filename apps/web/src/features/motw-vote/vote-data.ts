import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { Modules } from "@/features/module-of-the-week/service"
import { ApiModules } from "./api-modules"
import type { MotwVoteData } from "./catalog"

export class UnknownCoveredModules extends Data.TaggedError(
  "UnknownCoveredModules",
)<{
  readonly ids: ReadonlyArray<string>
}> {
  override get message(): string {
    return `apiModules names modules missing from the API reference: ${this.ids.join(", ")}`
  }
}

export class VoteData extends Context.Service<VoteData>()("website/VoteData", {
  make: Effect.gen(function* () {
    const modules = yield* Modules
    const apiModules = yield* ApiModules

    /** The API modules the posts name in their `apiModules` frontmatter. */
    const covered = Effect.map(modules.latest, (latest) =>
      pipe(
        latest,
        Array.flatMap(({ post }) => post.data.apiModules ?? []),
        Array.dedupe,
      ),
    )

    const snapshot = Effect.gen(function* () {
      const { index, covered: coveredIds } = yield* Effect.all(
        { index: apiModules.index, covered },
        { concurrency: "unbounded" },
      )
      // A misspelled id would leave a covered module votable. Skipped when the
      // API reference is missing, as in a checkout that never generated it.
      const known = new Set(index.ids)
      const unknown = Array.filter(coveredIds, (id) => !known.has(id))
      if (known.size > 0 && Array.isReadonlyArrayNonEmpty(unknown)) {
        return yield* new UnknownCoveredModules({ ids: unknown })
      }
      return { ...index, covered: coveredIds }
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
