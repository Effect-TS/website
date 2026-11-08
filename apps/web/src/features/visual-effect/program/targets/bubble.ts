import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import { startBubble } from "../drivers/bubble-animation"
import { Message } from "../message"
import { afterRender } from "../motion"
import { acquireDriver, makeTable } from "../target"

export const BubbleKey = Schema.Number.pipe(Schema.brand("BubbleKey"))
export type BubbleKey = typeof BubbleKey.Type

// NOTE: Module state on purpose. A Mount fills it and a Command reads it. See `target.ts`.
const table = makeTable<BubbleKey, boolean>()

/** Starts the shake of a failure or death bubble. A Command tells it when the bubble shows or hides. */
export const ShakeBubble = Mount.define("ShakeBubble", {
  args: {
    id: BubbleKey,
    isVisible: Schema.Boolean,
  },
  messages: [Message.CompletedShakeBubble],
  execute: ({ element, id, isVisible }) =>
    acquireDriver(
      element,
      (host) => startBubble(host, isVisible),
      (driver) => table.register(id, driver),
    ).pipe(Effect.as(Message.CompletedShakeBubble())),
})

/** Shows or hides the shake of a bubble. */
export const ChangeBubble = Command.define("ChangeBubble", {
  args: { id: BubbleKey, isVisible: Schema.Boolean },
  messages: [Message.CompletedChangeBubble],
  execute: ({ id, isVisible }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => table.send(id, isVisible))),
      Effect.as(Message.CompletedChangeBubble()),
    ),
})
