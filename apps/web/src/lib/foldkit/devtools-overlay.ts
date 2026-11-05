import { overlay } from "@foldkit/devtools/vite"
import { Effect, Exit, Option, Scope } from "effect"
import {
  type DevToolsOverlay,
  __setDevToolsOverlay,
} from "foldkit/devtools-host"
import { attachLayout } from "./devtools-layout"
import { type AppChoices, devToolsRegistry } from "./devtools-registry"
import {
  hostShadowRoot,
  resumeApplication,
  useNativeTrigger,
} from "./devtools-trigger"

const withChoices = overlay as unknown as (
  ...args: [...Parameters<DevToolsOverlay>, AppChoices]
) => ReturnType<DevToolsOverlay>

const registerApp: DevToolsOverlay = (store, position, mode, maybeBanner) =>
  Effect.gen(function* () {
    const runtimeScope = yield* Effect.scope
    let maybeMounted: Scope.Closeable | undefined
    let detachLayout: (() => void) | undefined
    const unregister = devToolsRegistry().register({
      name: Option.getOrElse(maybeBanner, () => "Foldkit app"),
      mount: (choices) => {
        const scope = Effect.runSync(Scope.make())
        maybeMounted = scope
        Effect.runFork(
          withChoices(store, position, mode, maybeBanner, choices).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                useNativeTrigger()
                const shadow = hostShadowRoot()
                if (shadow !== null) {
                  detachLayout = attachLayout(shadow)
                }
              }),
            ),
            Effect.provideService(Scope.Scope, scope),
          ),
        )
      },
      unmount: () => {
        if (maybeMounted === undefined) {
          return
        }
        resumeApplication()
        detachLayout?.()
        detachLayout = undefined
        Effect.runSync(Scope.close(maybeMounted, Exit.void))
        maybeMounted = undefined
      },
    })
    yield* Scope.addFinalizer(runtimeScope, Effect.sync(unregister))
  })

__setDevToolsOverlay(registerApp)
