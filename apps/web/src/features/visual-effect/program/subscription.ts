import { Effect, Queue, Schema, Stream } from "effect"
import { Subscription } from "foldkit"
import { Message } from "./message"
import type { Model } from "./model"
import { events } from "./runner"

const ticks = Stream.callback<Message>((queue) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const state = { frame: 0 }
      const tick = (): void => {
        Queue.offerUnsafe(queue, Message.TickedClock({ at: Date.now() }))
        state.frame = requestAnimationFrame(tick)
      }
      state.frame = requestAnimationFrame(tick)
      return state
    }),
    (state) => Effect.sync(() => cancelAnimationFrame(state.frame)),
  ).pipe(Effect.flatMap(() => Effect.never)),
)

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
  /** What the runs say. The Messages carry a `runId`, so a late one is ignored. */
  runEvents: Subscription.persistentEntry(Stream.fromQueue(events)),
  /** The timeline of an example follows the clock while the run goes. */
  clock: entry(
    { isTicking: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        // StartedRun sets the clock only for a timeline example
        isTicking: model.run._tag === "Running" && model.clock !== 0,
      }),
      dependenciesToStream: ({ isTicking }) =>
        Stream.when(
          ticks,
          Effect.sync(() => isTicking),
        ),
    },
  ),
}))
