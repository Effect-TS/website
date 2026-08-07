import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { HighlightSelector } from "../model/snippet-definition"
import {
  TemperatureArrayResult,
  TemperatureResult,
} from "../ui/results/temperature"

const getTemperature = (
  value: number,
  duration: Duration.Input,
): Effect.Effect<TemperatureResult> => {
  const result = new TemperatureResult(value)
  return Effect.sleep(duration).pipe(Effect.as(result))
}

export const forEachExample = defineExample({
  label: "Effect.forEach",
  description: "Execute an effectful operation for each element in an iterable",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const locations = ["New York", "London", "Tokyo"]
       |
       |const result = Effect.forEach(locations, getWeather)`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.forEach(locations, getWeather)",
  }),
  build: ({ addStep }) => {
    const newYork = addStep(getTemperature(65, "600 millis"), {
      label: "nyc",
      highlight: HighlightSelector.Text({ text: '"New York"' }),
    })
    const london = addStep(getTemperature(53, "800 millis"), {
      label: "london",
      highlight: HighlightSelector.Text({ text: '"London"' }),
    })
    const tokyo = addStep(getTemperature(72, "700 millis"), {
      label: "tokyo",
      highlight: HighlightSelector.Text({ text: '"Tokyo"' }),
    })
    const steps = [newYork, london, tokyo]
    return Effect.forEach(steps, identity).pipe(
      Effect.map((results) => new TemperatureArrayResult(results)),
    )
  },
})
