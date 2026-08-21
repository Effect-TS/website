import { Stack } from "alchemy/Stack"
import { Stage } from "alchemy/Stage"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { test } from "vite-plus/test"
import { providers } from "../src/Providers.ts"

test("builds without eagerly resolving credentials", async () => {
  const layer = providers().pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(Stack, {
          name: "EffectWebsite",
          stage: "test",
          resources: {},
          bindings: {},
          actions: {},
        }),
        Layer.succeed(Stage, "test"),
      ),
    ),
  )
  await Effect.runPromise(Effect.scoped(Layer.build(layer)))
})
