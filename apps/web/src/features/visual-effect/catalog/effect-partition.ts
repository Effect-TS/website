import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { PrimitiveResult } from "../ui/results/primitive"

const LICK_EMOJIS = ["👅", "😋", "👄", "😛"]

const STEPS = ["iceCream", "battery", "popsicle", "toad", "lollipop"]

export const partitionExample = defineExample({
  label: "Effect.partition",
  description:
    "Execute effects and partition results into successes and failures",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const partitioned = Effect.partition(
       |  [iceCream, battery, popsicle, toad, lollipop],
       |  performLick
       |)
       |const result = Effect.map(
       |  partitioned, 
       |  ([fails, successes]) =>
       |    \`👹 \${fails.length} 😇 \${successes.length}\`
       |)`,
    ),
  },
  resultHighlight: HighlightSelector.LineRange({
    startLine: 5,
    endLine: 9,
  }),
  build: ({ addStep }) => {
    const lick = Effect.gen(function* () {
      const notifications = yield* Notifications

      const delay = yield* Random.nextIntBetween(500, 1000)
      yield* Effect.sleep(delay)

      const roll = yield* Random.next
      if (roll < 0.5) {
        const index = yield* Random.nextIntBetween(0, LICK_EMOJIS.length, {
          halfOpen: true,
        })
        const emoji = LICK_EMOJIS[index]!
        return new PrimitiveResult(emoji)
      }

      return yield* Effect.fail(new PrimitiveResult("DEMONIC!")).pipe(
        Effect.tapError((result) => notifications.notify(`${result.value}`)),
      )
    })

    const steps = STEPS.map((step) =>
      addStep(lick, {
        label: step,
        highlight: HighlightSelector.Text({ text: step }),
      }),
    )

    return Effect.partition(steps, identity).pipe(
      Effect.map(
        ([failures, successes]) =>
          new PrimitiveResult(`👹 ${failures.length} 😇 ${successes.length}`),
      ),
    )
  },
})
