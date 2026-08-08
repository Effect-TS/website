import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { HighlightSelector } from "../model/snippet-definition"
import { TemperatureResult } from "../ui/results/temperature"

export const promiseExample = defineExample({
  label: "Effect.promise",
  description:
    "Create an effect from an asynchronous computation guaranteed to succeed",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|function readTemperature(location: string) {
       |  return Effect.promise(() => 
       |    fetch("slow.weather.com/api/" + location)
       |      .then((response) => response.json)
       |  )
       |}
       |
       |const result = readTemperature("london")`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: 'readTemperature("london")',
  }),
  build: Effect.fnUntraced(function* () {
    const delay = yield* Random.nextIntBetween(600, 900)
    yield* Effect.sleep(delay)
    const temperature = yield* Random.nextIntBetween(45, 75)
    return new TemperatureResult(temperature)
  }),
})
