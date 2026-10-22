import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as AstroContent from "./astro-content"
import { Enterprise } from "./service"

const runtime = ManagedRuntime.make(
  Enterprise.layer.pipe(Layer.provide(AstroContent.layer)),
)

/** Content for `/enterprise`. Fails the build when any of it is missing. */
export const loadEnterprisePage = () =>
  runtime.runPromise(
    Effect.gen(function* () {
      const enterprise = yield* Enterprise
      return yield* enterprise.page
    }),
  )
