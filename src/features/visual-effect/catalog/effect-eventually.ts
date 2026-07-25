import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as Schedule from "effect/Schedule"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { EmojiResult } from "../ui/results/emoji"
import { ErrorResult } from "../ui/results/error"

const FAILURE_MESSAGES = [
  "Card Read Error!",
  "Too Fast!",
  "Too Slow!",
  "Overdraft Fee!",
  "Insufficient Funds!",
]

export const eventuallyExample = defineExample({
  label: "Effect.eventually",
  description: "Run an effect repeatedly until it succeeds, ignoring errors",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const swipeCard = swipeCard()
       |const result = Effect.eventually(swipeCard)`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.eventually(swipeCard)",
  }),
  build: ({ addStep }) => {
    const state = { retries: 0 }

    const swipeCard = Effect.gen(function* () {
      const delay = yield* Random.nextIntBetween(400, 600)
      yield* Effect.sleep(delay)

      // Determine failure based on current retry count
      const failureThreshold = yield* Random.nextIntBetween(2, 5)
      const shouldFail = state.retries < failureThreshold

      if (shouldFail) {
        state.retries += 1
        const index = yield* Random.nextIntBetween(0, FAILURE_MESSAGES.length, {
          halfOpen: true,
        })
        const message = FAILURE_MESSAGES[index]!
        return yield* Effect.fail(new ErrorResult(message)).pipe(
          Effect.tapError((error) => Notifications.use(({ notify }) => notify(error.message))),
        )
      }

      return new EmojiResult("Money")
    })

    const swipeCardStep = addStep(swipeCard, {
      label: "pizza",
      highlight: HighlightSelector.Text({ text: "swipeCard()" }),
    })

    return Effect.suspend(() => {
      state.retries = 0
      return swipeCardStep.pipe(Effect.retry(Schedule.fixed("1.5 seconds")))
    })
  },
})
