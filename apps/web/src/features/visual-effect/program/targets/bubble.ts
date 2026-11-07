import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import { startBubble } from "../drivers/bubble-animation"
import { Message } from "../message"
import { afterRender } from "../motion"
import { acquireDriver, makeTable } from "../target"

const table = makeTable<number, boolean>()

/** Starts the shake of a failure or death bubble. A Command tells it when the bubble shows or hides. */
export const ShakeBubble = Mount.define("ShakeBubble", {
  args: {
    id: Schema.Number,
    tone: Schema.Literals(["failure", "death"]),
    isVisible: Schema.Boolean,
  },
  messages: [Message.CompletedShakeBubble],
  execute: ({ element, id, tone, isVisible }) =>
    acquireDriver(
      () => startBubble(element as HTMLElement, tone, isVisible),
      (driver) => table.register(id, driver),
    ).pipe(Effect.as(Message.CompletedShakeBubble())),
})

/** Shows or hides the shake of a bubble. */
export const ChangeBubble = Command.define("ChangeBubble", {
  args: { id: Schema.Number, isVisible: Schema.Boolean },
  messages: [Message.CompletedShakeBubble],
  execute: ({ id, isVisible }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => table.send(id, isVisible))),
      Effect.as(Message.CompletedShakeBubble()),
    ),
})
