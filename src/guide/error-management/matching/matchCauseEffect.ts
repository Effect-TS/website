import { Effect, Console } from "effect"

declare const exceptionalEffect: Effect.Effect<never, Error, void>

const program = Effect.matchCauseEffect(exceptionalEffect, {
  onFailure: (cause) => {
    switch (cause._tag) {
      case "Fail":
        return Console.log(`Fail: ${cause.error.message}`)
      case "Die":
        return Console.log(`Die: ${cause.defect}`)
      case "Interrupt":
        return Console.log(`${cause.fiberId} interrupted!`)
    }
    return Console.log("failed due to other causes")
  },
  onSuccess: (value) => Console.log(`succeeded with ${value} value`)
})
