import { Effect, Stream } from "effect"
import { defineToolbarApp } from "astro/toolbar"
import { devToolsRegistry } from "./devtools-registry"

/**
 * The toolbar button opens and closes the DevTools panel through the
 * Controller and mirrors its state. With several apps the panel carries a tab
 * strip; see `devtools-layout.ts`.
 */
export default defineToolbarApp({
  init: (_canvas, app) => {
    const { controller } = devToolsRegistry()
    app.onToggled(({ state }) => {
      if (controller.snapshot().isOpen !== state) {
        if (state) {
          controller.open()
        } else {
          controller.close()
        }
      }
    })
    app.toggleState({ state: controller.snapshot().isOpen })
    Effect.runFork(
      Stream.runForEach(controller.changes, (event) =>
        Effect.sync(() => app.toggleState({ state: event._tag === "Opened" })),
      ),
    )
  },
})
