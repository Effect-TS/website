import { Effect } from "effect"

declare const exceptionalEffect: Effect.Effect<never, Error, void>

const program = Effect.matchCauseEffect(exceptionalEffect, {
  onFailure: (cause) => {
    switch (cause._tag) {
      case "Fail":
        return Effect.sync(() => console.log(`Fail: ${cause.error.message}`))
      case "Die":
        return Effect.sync(() => console.log(`Die: ${cause.defect}`))
      case "Interrupt":
        return Effect.sync(() => console.log(`${cause.fiberId} interrupted!`))
    }
    return Effect.sync(() => console.log("failed due to other causes"))
  },
  onSuccess: (value) =>
    Effect.sync(() => console.log(`succeeded with ${value} value`))
})
