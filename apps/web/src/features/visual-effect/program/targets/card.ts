import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import { FinalizerPhase } from "../domain"
import type { CardInput } from "../drivers/layout-animation"
import { startCardAnimation } from "../drivers/layout-animation"
import { Message } from "../message"
import { afterRender } from "../motion"
import { acquireDriver, makeTable } from "../target"

export const CardKey = Schema.String.pipe(Schema.brand("CardKey"))
export type CardKey = typeof CardKey.Type

const input = {
  id: CardKey,
  x: Schema.Number,
  scale: Schema.Number,
  phase: FinalizerPhase,
}

const table = makeTable<CardKey, CardInput>()

/** Starts the spring of a finalizer card. A Command gives it each new place and phase. */
export const AnimateFinalizerCard = Mount.define("AnimateFinalizerCard", {
  args: input,
  messages: [Message.CompletedAnimateFinalizerCard],
  execute: ({ element, id, ...initial }) =>
    acquireDriver(
      () => startCardAnimation(element as HTMLElement, initial),
      (driver) => table.register(id, driver),
    ).pipe(Effect.as(Message.CompletedAnimateFinalizerCard())),
})

/** Moves a finalizer card to its new place and phase. */
export const ChangeCard = Command.define("ChangeCard", {
  args: input,
  messages: [Message.CompletedAnimateFinalizerCard],
  execute: ({ id, ...next }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => table.send(id, next))),
      Effect.as(Message.CompletedAnimateFinalizerCard()),
    ),
})
