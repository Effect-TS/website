import { overlay } from "@foldkit/devtools/vite"
import { Effect, Exit, Scope } from "effect"
import { DEVTOOLS_HOST_ID, type DevToolsOverlay } from "foldkit/devtools-host"
import { attachLayout } from "./devtools-layout"
import type { RegisteredProgram } from "./devtools-registry"

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

export const mountProgram = (
  ...args: Parameters<DevToolsOverlay>
): Pick<RegisteredProgram, "mount" | "unmount"> => {
  const [store, position, mode, maybeBanner] = args
  let maybeMounted: Scope.Closeable | undefined
  let detachLayout: (() => void) | undefined
  return {
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
  }
}
