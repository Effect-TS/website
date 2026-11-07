import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import type { HeaderInput } from "../drivers/header-animation"
import { startHeaderAnimation } from "../drivers/header-animation"
import { Message } from "../message"
import { NodeTagSchema } from "../drivers/node-motion"
import { PointerSchema, afterRender } from "../motion"
import { acquireDriver, makeSlot } from "../target"

const input = {
  tag: NodeTagSchema,
  hasInteracted: Schema.Boolean,
  pointer: PointerSchema,
}

const slot = makeSlot<HeaderInput>()

/** Starts the animation of the play, stop and reset button. A Command gives it each new state. */
export const AnimateHeader = Mount.define("AnimateHeader", {
  args: input,
  messages: [Message.CompletedAnimateHeader],
  execute: ({ element, ...initial }) =>
    acquireDriver(
      () => startHeaderAnimation(element as HTMLElement, initial),
      slot.register,
    ).pipe(Effect.as(Message.CompletedAnimateHeader())),
})

/** Gives the play, stop and reset button its new state. */
export const ChangeHeader = Command.define("ChangeHeader", {
  args: input,
  messages: [Message.CompletedAnimateHeader],
  execute: (next) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => slot.send(next))),
      Effect.as(Message.CompletedAnimateHeader()),
    ),
})
