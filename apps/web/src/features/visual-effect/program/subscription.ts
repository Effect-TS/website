import { Stream } from "effect"
import { Subscription } from "foldkit"
import { Message } from "./message"
import type { Model } from "./model"
import { events } from "./runner"

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  /** What the runs say. The Messages carry a `runId`, so a late one is ignored. */
  runEvents: Subscription.persistentEntry(Stream.fromQueue(events)),
  /** The timeline of an example follows the clock while the run goes. StartedRun sets the clock only for a timeline example. */
  clock: Subscription.animationFrameEntry({
    isActive: (model) => model.run._tag === "Running" && model.clock !== 0,
    toMessage: () => Message.TickedClock({ at: Date.now() }),
  }),
}))
