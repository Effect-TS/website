import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import { startHighlightAnimation } from "../drivers/layout-animation"
import { Message } from "../message"
import { afterRender } from "../motion"
import { acquireDriver, makeSlot } from "../target"

const input = {
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  isVisible: Schema.Boolean,
}

const HighlightInput = Schema.Struct(input)
export type HighlightInput = typeof HighlightInput.Type

// NOTE: Module state on purpose. A Mount fills it and a Command reads it. See `target.ts`.
const slot = makeSlot<HighlightInput>()

/** Starts the spring of the highlight box. A Command gives it each new target. */
export const AnimateHighlight = Mount.define("AnimateHighlight", {
  args: input,
  messages: [Message.CompletedAnimateHighlight],
  execute: ({ element, ...initial }) =>
    acquireDriver(
      element,
      (host) => startHighlightAnimation(host, initial),
      slot.register,
    ).pipe(Effect.as(Message.CompletedAnimateHighlight())),
})

/** Moves the highlight box to its new target, or fades it. */
export const ChangeHighlight = Command.define("ChangeHighlight", {
  args: input,
  messages: [Message.CompletedAnimateHighlight],
  execute: (next) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => slot.send(next))),
      Effect.as(Message.CompletedAnimateHighlight()),
    ),
})
