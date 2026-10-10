import type { APIRoute } from "astro"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as AstroContent from "./astro-content"
import type { LlmsContentError, LlmsScopeNotFound } from "./domain"
import { Llms } from "./service"

type Variant = "index" | "full"

// One runtime for all routes, so scopes and their cached sections are built
// once per build instead of once per file.
const runtime = ManagedRuntime.make(
  Llms.layer.pipe(Layer.provide(AstroContent.layer)),
)

const run = <A>(
  effect: Effect.Effect<A, LlmsContentError | LlmsScopeNotFound, Llms>,
): Promise<A> => runtime.runPromise(effect)

const text = (body: string) =>
  new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })

const notFound = () => new Response("Not Found", { status: 404 })

export const rootEndpoint =
  (variant: Variant): APIRoute =>
  () =>
    run(
      Effect.gen(function* () {
        const llms = yield* Llms
        return text(yield* variant === "index" ? llms.rootIndex : llms.rootFull)
      }),
    )

export const scopeStaticPaths = (kind: string) =>
  run(
    Effect.gen(function* () {
      const { scopes } = yield* Llms
      return scopes
        .filter((scope) => scope.kind === kind)
        .map((scope) => ({ params: { ...scope.params } }))
    }),
  )

export const scopeEndpoint =
  (kind: string, variant: Variant): APIRoute =>
  ({ params }) =>
    run(
      Effect.gen(function* () {
        const llms = yield* Llms
        const scope = yield* llms.scope(kind, params)
        return text(
          yield* variant === "index"
            ? llms.scopeIndex(scope)
            : llms.scopeFull(scope),
        )
      }).pipe(
        Effect.catchTag("LlmsScopeNotFound", () => Effect.succeed(notFound())),
      ),
    )
