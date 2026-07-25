import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { EmojiResult } from "../ui/results/emoji"
import { ErrorResult } from "../ui/results/error"

export const catchExample = defineExample({
  label: "Effect.catchAll",
  description: "Try one effect, and if it fails, catch the error and run another effect",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const shoot = shootFirst()
       |const question = askQuestions()
       |
       |const result = Effect.catchAll(shoot, (error) => question)`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.catchAll(shoot, (error) => question)",
  }),
  build: ({ addStep }) => {
    const state = { attempt: 0 }

    const shoot = Effect.gen(function* () {
      const notifications = yield* Notifications

      const currentAttempt = state.attempt
      state.attempt = (state.attempt + 1) % 3

      const delay = yield* Random.nextIntBetween(300, 600)
      yield* Effect.sleep(delay)

      // Cycle: 0 = fail, 1 = succeed, 2 = fail
      if (currentAttempt === 1) {
        return new EmojiResult("Shoot")
      }

      return yield* Effect.fail(new ErrorResult("Out of Ammo!")).pipe(
        Effect.tapError((error) => notifications.notify(error.message)),
      )
    })

    const question = Effect.gen(function* () {
      const notifications = yield* Notifications

      const delay = yield* Random.nextIntBetween(300, 600)
      yield* Effect.sleep(delay)

      // Cycle: 1 = succeed, 2 = succeed, 3 = fail
      if (state.attempt === 2) {
        return yield* Effect.fail(new ErrorResult("Brain Fart!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      return new EmojiResult("Thinking")
    })

    const shootStep = addStep(shoot, {
      label: "shoot",
      highlight: HighlightSelector.Text({ text: "shootFirst()" }),
    })

    const questionStep = addStep(question, {
      label: "question",
      highlight: HighlightSelector.Text({ text: "askQuestions()" }),
    })

    return Effect.catch(shootStep, () => questionStep)
  },
})
