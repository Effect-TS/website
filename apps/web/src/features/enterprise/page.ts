import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import { AstroContent } from "@/lib/astro-content"
import { Avatars } from "./avatars"
import { Enterprise } from "./service"

const runtime = ManagedRuntime.make(
  Enterprise.layer.pipe(
    Layer.provide(Layer.mergeAll(AstroContent.layer, Avatars.layer)),
  ),
)

/** Content for `/enterprise`. Fails the build when any of it is missing. */
export const loadEnterprisePage = () =>
  runtime.runPromise(
    Effect.gen(function* () {
      const enterprise = yield* Enterprise
      return yield* enterprise.page
    }),
  )
