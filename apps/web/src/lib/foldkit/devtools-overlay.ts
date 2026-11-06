import { overlay } from "@foldkit/devtools/vite"
import { Effect, Exit, Option, Scope } from "effect"
import {
  DEVTOOLS_HOST_ID,
  type DevToolsOverlay,
  __setDevToolsOverlay,
} from "foldkit/devtools-host"
import { attachLayout } from "./devtools-layout"
import { devToolsRegistry } from "./devtools-registry"

const HOST_STACKING_STYLE_ID = "foldkit-devtools-stacking"
const BELOW_ASTRO_TOOLBAR = "999998"

const stackBelowAstroToolbar = (): void => {
  if (document.getElementById(HOST_STACKING_STYLE_ID) !== null) {
    return
  }
  const stacking = document.createElement("style")
  stacking.id = HOST_STACKING_STYLE_ID
  stacking.textContent = `#${DEVTOOLS_HOST_ID} { z-index: ${BELOW_ASTRO_TOOLBAR} !important; }`
  document.head.appendChild(stacking)
}

const registerProgram: DevToolsOverlay = (store, position, mode, maybeBanner) =>
  Effect.gen(function* () {
    const runtimeScope = yield* Effect.scope
    let maybeMounted: Scope.Closeable | undefined
    let detachLayout: (() => void) | undefined
    const unregister = devToolsRegistry().register({
      name: Option.getOrElse(maybeBanner, () => "Foldkit program"),
      mount: (programs, controller) => {
        const scope = Effect.runSync(Scope.make())
        maybeMounted = scope
        Effect.runFork(
          overlay(store, position, mode, maybeBanner, programs, controller, {
            showBadge: false,
          }).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                stackBelowAstroToolbar()
                const shadow =
                  document.getElementById(DEVTOOLS_HOST_ID)?.shadowRoot ?? null
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
        detachLayout?.()
        detachLayout = undefined
        Effect.runSync(Scope.close(maybeMounted, Exit.void))
        maybeMounted = undefined
      },
    })
    yield* Scope.addFinalizer(runtimeScope, Effect.sync(unregister))
  })

__setDevToolsOverlay(registerProgram)
