import * as Effect from "effect/Effect"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { PrimitiveResult } from "../ui/results/primitive"

export const sleepExample = defineExample({
  label: "Effect.sleep",
  description: "Create an effect that suspends execution for a given duration",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const result = Effect.gen(function* () {
       |  yield* Effect.sleep("3 seconds")
       |  return "Refreshed!"
       |})`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: 'Effect.sleep("3 seconds")',
  }),
  build: Effect.fnUntraced(function* () {
    const notifications = yield* Notifications

    // Start the program without the notification
    yield* Effect.sleep("1 second")

    // Then show the notification for the remainder of the program
    yield* notifications.notify("😴", {
      duration: "2 seconds",
    })

    yield* Effect.sleep("2 seconds")

    return new PrimitiveResult("Refreshed!")
  }),
})
