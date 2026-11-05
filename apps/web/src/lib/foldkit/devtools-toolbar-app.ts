import { defineToolbarApp } from "astro/toolbar"
import { trigger } from "./devtools-trigger"

/**
 * The toolbar button toggles the DevTools panel and mirrors its state. With
 * several apps the panel carries a tab strip; see `devtools-layout.ts`.
 */
export default defineToolbarApp({
  init: (_canvas, app) => {
    app.onToggled(({ state }) => {
      if (trigger.isOpen() !== state) {
        trigger.toggle()
      }
    })
    trigger.subscribe((isOpen) => app.toggleState({ state: isOpen }))
  },
})
