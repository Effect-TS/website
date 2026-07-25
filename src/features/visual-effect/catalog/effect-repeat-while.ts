import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as Schedule from "effect/Schedule"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { HighlightSelector } from "../model/snippet-definition"
import { PrimitiveResult } from "../ui/results/primitive"

export const repeatWhileExample = defineExample({
  label: "Effect.repeat",
  subtitle: "while",
  description: "Repeat an effect while a schedule condition is true",
  features: { timeline: true },
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const hotdog = eatHotdog()
       |const schedule = Schedule.spaced(Duration.millis(400)).pipe(
       |  Schedule.upTo({ duration: Duration.seconds(10) })
       |)
       |const contest = Effect.repeat(hotdog, schedule)`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.repeat(hotdog, schedule)",
  }),
  build: ({ addStep }) => {
    const state = { amountConsumed: 0 }

    const eatHotDog = Effect.gen(function* () {
      const delay = yield* Random.nextBetween(500, 900) // Variable eating speed
      yield* Effect.sleep(delay)
      state.amountConsumed += 1
      const hotdogs = "🌭".repeat(state.amountConsumed)
      return new PrimitiveResult(hotdogs)
    })

    const checkPhoneStep = addStep(eatHotDog, {
      label: "hotdog",
      highlight: HighlightSelector.Text({ text: "eatHotdog()" }),
      addToTimeline: true,
    })

    const schedule = Schedule.spaced(Duration.millis(400)).pipe(
      Schedule.upTo({ duration: Duration.seconds(10) }),
    )

    return Effect.suspend(() => {
      state.amountConsumed = 0
      return Effect.repeat(checkPhoneStep, schedule).pipe(
        Effect.map(() => new PrimitiveResult(`🤢 ${state.amountConsumed.toString()} Hotdogs!`)),
      )
    })
  },
})
