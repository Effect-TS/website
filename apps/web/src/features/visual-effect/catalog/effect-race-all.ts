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

export const raceAllExample = defineExample({
  label: "Effect.raceAll",
  description: "Race multiple effects and return the first successful result",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const cat = runFast("cat")
       |const dog = runFast("dog")  
       |const mouse = runFast("mouse")
       |const rabbit = runFast("rabbit")
       | 
       |const winner = Effect.raceAll([cat, dog, mouse, rabbit])`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.raceAll([cat, dog, mouse, rabbit])",
  }),
  build: ({ addStep }) =>
    Effect.raceAll([
      addStep(getEmoji("Cat"), {
        label: "cat",
        highlight: HighlightSelector.Text({ text: 'runFast("cat")' }),
      }),
      addStep(getEmoji("Dog"), {
        label: "dog",
        highlight: HighlightSelector.Text({ text: 'runFast("dog")' }),
      }),
      addStep(getEmoji("Mouse"), {
        label: "mouse",
        highlight: HighlightSelector.Text({ text: 'runFast("mouse")' }),
      }),
      addStep(getEmoji("Rabbit"), {
        label: "rabbit",
        highlight: HighlightSelector.Text({ text: 'runFast("rabbit")' }),
      }),
    ]),
})
