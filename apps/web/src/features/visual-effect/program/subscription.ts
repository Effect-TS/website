import { Effect, Stream } from "effect"
import { Subscription } from "foldkit"
import { Message } from "./message"
import type { Model } from "./model"
import { RunSession } from "./runner"

export const subscriptions = Subscription.make<Model, Message, RunSession>()(
  () => ({
    /** What the runs of this Program say. */
    runEvents: Subscription.persistentEntry(
      Stream.unwrap(
        Effect.gen(function* () {
          const { events } = yield* RunSession
          return Stream.fromQueue(events)
        }),
      ),
    ),
    /** The timeline of an example follows the clock while the run goes. StartedRun sets the clock only for a timeline example. */
    clock: Subscription.animationFrameEntry({
      isActive: (model) => model.run._tag === "Running" && model.clock !== 0,
      toMessage: (deltaTime) => Message.TickedClock({ deltaTime }),
    }),
  }),
)
