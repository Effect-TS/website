import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import { FinalizerPhase } from "../domain"
import { startCardAnimation } from "../drivers/layout-animation"
import { Message } from "../message"
import { afterRender } from "../motion"
import { acquireDriver, makeTable } from "../target"

export const CardKey = Schema.String.pipe(Schema.brand("CardKey"))
export type CardKey = typeof CardKey.Type

const motion = {
  x: Schema.Number,
  scale: Schema.Number,
  phase: FinalizerPhase,
}

const CardInput = Schema.Struct(motion)
export type CardInput = typeof CardInput.Type

const input = { id: CardKey, ...motion }

// NOTE: Module state on purpose. A Mount fills it and a Command reads it. See `target.ts`.
const table = makeTable<CardKey, CardInput>()

/** Starts the spring of a finalizer card. A Command gives it each new place and phase. */
export const AnimateFinalizerCard = Mount.define("AnimateFinalizerCard", {
  args: input,
  messages: [Message.CompletedAnimateFinalizerCard],
  execute: ({ element, id, ...initial }) =>
    acquireDriver(
      element,
      (host) => startCardAnimation(host, initial),
      (driver) => table.register(id, driver),
    ).pipe(Effect.as(Message.CompletedAnimateFinalizerCard())),
})

/** Moves a finalizer card to its new place and phase. */
export const ChangeCard = Command.define("ChangeCard", {
  args: input,
  messages: [Message.CompletedChangeCard],
  execute: ({ id, ...next }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => table.send(id, next))),
      Effect.as(Message.CompletedChangeCard()),
    ),
})
