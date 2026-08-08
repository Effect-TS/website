import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { HighlightSelector } from "../model/snippet-definition"
import { EmojiResult, type EmojiKey } from "../ui/results/emoji"

const getEmoji = Effect.fnUntraced(function* (
  emoji: EmojiKey,
): Effect.fn.Return<EmojiResult> {
  const result = new EmojiResult(emoji)
  const delay = yield* Random.nextBetween(500, 900)
  return yield* Effect.sleep(delay).pipe(Effect.as(result))
})

export const raceExample = defineExample({
  label: "Effect.race",
  description:
    "Race two effects and return the result of the first successful one",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const tortoise = runFast("tortoise")
       |const achilles = runFast("achilles")
       |
       |const winner = Effect.race(tortoise, achilles)`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.race(tortoise, achilles)",
  }),
  build: ({ addStep }) =>
    Effect.race(
      addStep(getEmoji("Tortoise"), {
        label: "tortoise",
        highlight: HighlightSelector.Text({ text: 'runFast("tortoise")' }),
      }),
      addStep(getEmoji("Achilles"), {
        label: "achilles",
        highlight: HighlightSelector.Text({ text: 'runFast("achilles")' }),
      }),
    ),
})
