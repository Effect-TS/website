import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Docs from "./docs"
import {
  LlmsScopeNotFound,
  type LlmsContentError,
  type LlmsScope,
} from "./domain"
import {
  renderRootFull,
  renderRootIndex,
  renderScopeFull,
  renderScopeIndex,
} from "./render"

type Rendered = Effect.Effect<string, LlmsContentError>

export class Llms extends Context.Service<
  Llms,
  {
    readonly scopes: ReadonlyArray<LlmsScope>
    /** The scope of `kind` whose `params` match the route params. */
    readonly scope: (
      kind: string,
      params: Readonly<Record<string, string | undefined>>,
    ) => Effect.Effect<LlmsScope, LlmsScopeNotFound>
    readonly rootIndex: Rendered
    readonly rootFull: Rendered
    readonly scopeIndex: (scope: LlmsScope) => Rendered
    readonly scopeFull: (scope: LlmsScope) => Rendered
  }
>()("website/Llms") {
  static layer = (site: URL) => Layer.effect(this, make(site))
}

const make = Effect.fn("Llms.make")(function* (site: URL) {
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

  const scopeFull = Effect.fn("Llms.scopeFull")(function* (target: LlmsScope) {
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
  }
})
