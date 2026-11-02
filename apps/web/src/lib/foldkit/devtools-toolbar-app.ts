import { defineToolbarApp } from "astro/toolbar"
import { connectTrigger } from "./devtools-trigger"

export default defineToolbarApp({
  init: (_canvas, app) => {
    const trigger = connectTrigger()
    app.onToggled(({ state }) => {
      void trigger.then((connected) => {
        if (connected.isOpen() !== state) {
          connected.toggle()
        }
      })
    })
    void trigger.then((connected) => {
      app.toggleState({ state: connected.isOpen() })
      connected.subscribe((isOpen) => app.toggleState({ state: isOpen }))
    })
  },
})
