import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Docs from "./docs"
import { LlmsScopeNotFound, type LlmsScope } from "./domain"
import {
  renderRootFull,
  renderRootIndex,
  renderScopeFull,
  renderScopeIndex,
} from "./render"

export class Llms extends Context.Service<Llms>()("website/Llms", {
  make: Effect.gen(function* () {
    const site = yield* Config.URL("SITE").pipe(
      Config.withDefault(new URL("https://effect.website")),
    )

    // Add new content sources (changelog, tutorials, ...) here.
    const scopes = [...(yield* Docs.scopes)]

    const scope = Effect.fn("Llms.scope")(function* (
      kind: string,
      params: Readonly<Record<string, string | undefined>>,
    ) {
      const match = scopes.find(
        (candidate) =>
          candidate.kind === kind &&
          Object.entries(candidate.params).every(
            ([key, value]) => params[key] === value,
          ),
      )
      return match ?? (yield* new LlmsScopeNotFound({ kind }))
    })

    const scopeIndex = Effect.fn("Llms.scopeIndex")(function* (
      target: LlmsScope,
    ) {
      return renderScopeIndex(target, yield* target.sections, site)
    })

    const scopeFull = Effect.fn("Llms.scopeFull")(function* (
      target: LlmsScope,
    ) {
      return renderScopeFull(target, yield* target.sections, site)
    })

    const rootFull = Effect.forEach(
      scopes.filter((candidate) => candidate.inRootFull),
      scopeFull,
      { concurrency: "unbounded" },
    ).pipe(Effect.map(renderRootFull))

    return {
      scopes,
      scope,
      rootIndex: Effect.succeed(renderRootIndex(scopes, site)),
      rootFull,
      scopeIndex,
      scopeFull,
    } as const
  }),
}) {
  static layer = Layer.effect(this, this.make)
}
