import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { EmojiResult } from "../ui/results/emoji"
import { ErrorResult } from "../ui/results/error"

const FAILURE_MESSAGES = ["TOO SLOW!", "SPOILED!", "STARVED TO DEATH!", "IT'S COLD!"]

export const timeoutExample = defineExample({
  label: "Effect.timeout",
  description: "Add a time limit to an effect, failing with timeout if exceeded",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const pizza = orderDelivery()
       |const result = Effect.timeout(pizza, "1 second")`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: 'Effect.timeout(pizza, "1 second")',
  }),
  build: ({ addStep }) => {
    const state = { attempt: 0 }

    const pizza = Effect.gen(function* () {
      const currentAttempt = state.attempt
      state.attempt = (state.attempt + 1) % 2
      const isFirstAttempt = currentAttempt === 0

      const delay = yield* isFirstAttempt
        ? Random.nextIntBetween(1500, 2000)
        : Random.nextIntBetween(400, 700)
      yield* Effect.sleep(delay)

      return new EmojiResult("Pizza")
    })

    const pizzaStep = addStep(pizza, {
      label: "pizza",
      highlight: HighlightSelector.Text({ text: "orderDelivery()" }),
    })

    return Effect.timeout(pizzaStep, "1 second").pipe(
      Effect.catch(
        Effect.fnUntraced(function* () {
          const index = yield* Random.nextIntBetween(0, 3)
          const message = FAILURE_MESSAGES[index]!
          return yield* Effect.fail(new ErrorResult(message))
        }),
      ),
      Effect.tapError((error) =>
        Notifications.use(({ notify }) =>
          notify(error.message, {
            showOnHover: true,
          }),
        ),
      ),
    )
  },
})
