import { Effect, Stream, SubscriptionRef } from "effect"
import { defineToolbarApp } from "astro/toolbar"
import { devToolsRegistry } from "./devtools-registry"
import { toolbarPlacement } from "./devtools-toolbar-placement"

/**
 * The toolbar button opens and closes the DevTools panel through the
 * Controller and mirrors its state. It also tells the Placement where Astro puts
 * the toolbar.
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
    app.onToolbarPlacementUpdated(({ placement }) =>
      Effect.runSync(SubscriptionRef.set(toolbarPlacement(), placement)),
    )
    app.toggleState({ state: controller.snapshot().isOpen })
    Effect.runFork(
      Stream.runForEach(controller.changes, (event) =>
        Effect.sync(() => app.toggleState({ state: event._tag === "Opened" })),
      ),
    )
  },
})
