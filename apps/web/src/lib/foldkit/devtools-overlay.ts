import { Effect, Option, Scope } from "effect"
import {
  type DevToolsOverlay,
  __setDevToolsOverlay,
} from "foldkit/devtools-host"
import { mountProgram } from "./devtools-mount"
import { devToolsRegistry } from "./devtools-registry"

const registerProgram: DevToolsOverlay = (...args) =>
  Effect.gen(function* () {
    const [, , , maybeBanner] = args
    const runtimeScope = yield* Effect.scope
    const unregister = devToolsRegistry().register({
      name: Option.getOrElse(maybeBanner, () => "Foldkit program"),
      ...mountProgram(...args),
    })
    yield* Scope.addFinalizer(runtimeScope, Effect.sync(unregister))
  })

__setDevToolsOverlay(registerProgram)
