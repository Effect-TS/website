import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as String from "effect/String"
import { VisualEffectSegmentedControl } from "@/features/visual-effect/components/VisualEffectSegmentedControl"
import type { ControlRenderProps } from "../model/example-definition"
import { defineExample } from "../model/define-example"
import { HighlightSelector } from "../model/snippet-definition"
import {
  TemperatureArrayResult,
  TemperatureResult,
} from "../ui/results/temperature"

type ConcurrencyMode = "sequential" | "numbered" | "unbounded"

const CONCURRENCY_OPTIONS: ReadonlyArray<ConcurrencyMode> = [
  "sequential",
  "numbered",
  "unbounded",
]

function ConcurrencyModeControl({
  control,
}: ControlRenderProps<ConcurrencyMode>) {
  return (
    <VisualEffectSegmentedControl
      control={control}
      options={CONCURRENCY_OPTIONS}
    />
  )
}

const getTemperature = (
  value: number,
  duration: Duration.Input,
): Effect.Effect<TemperatureResult> => {
  const result = new TemperatureResult(value)
  return Effect.sleep(duration).pipe(Effect.as(result))
}

const getResultCodeSnippet = (mode: ConcurrencyMode): string => {
  switch (mode) {
    case "sequential":
      return "Effect.all([nyc, berlin, tokyo, london])"
    case "numbered":
      return String.stripMargin(
        `|Effect.all([nyc, berlin, tokyo, london], {
         |  concurrency: 2
         |})`,
      )
    case "unbounded":
      return String.stripMargin(
        `|Effect.all([nyc, berlin, tokyo, london], {
         |  concurrency: "unbounded"
         |})`,
      )
  }
}

const getCodeSnippet = (mode: ConcurrencyMode): string =>
  String.stripMargin(
    `|const nyc = readTemperature("New York")
     |const berlin = readTemperature("Berlin")
     |const tokyo = readTemperature("Tokyo")
     |const london = readTemperature("London")
     |
     |const result = ${getResultCodeSnippet(mode)}`,
  )

export const allExample = defineExample({
  label: "Effect.all",
  description:
    "Combine multiple effects into one, returning results based on input structure",
  code: {
    language: "typescript",
    source: getCodeSnippet("sequential"),
  },
  resultHighlight: HighlightSelector.Text({
    text: getResultCodeSnippet("sequential"),
  }),
  build: ({ addStep, controls, snippet }) => {
    const concurrency = controls.register({
      id: "concurrency",
      label: "Concurrency",
      description: "Changing mode resets the current run.",
      initialValue: "sequential",
      render: ConcurrencyModeControl,
    })

    snippet.setCode(({ get }) => ({
      language: "typescript",
      source: getCodeSnippet(get(concurrency)),
    }))
    snippet.setResultHighlight(({ get }) =>
      HighlightSelector.Text({
        text: getResultCodeSnippet(get(concurrency)),
      }),
    )

    const nyc = addStep(getTemperature(65, "900 millis"), {
      label: "nyc",
      highlight: HighlightSelector.Text({
        text: 'readTemperature("New York")',
      }),
    })
    const berlin = addStep(getTemperature(44, "500 millis"), {
      label: "berlin",
      highlight: HighlightSelector.Text({ text: 'readTemperature("Berlin")' }),
    })
    const tokyo = addStep(getTemperature(72, "650 millis"), {
      label: "tokyo",
      highlight: HighlightSelector.Text({ text: 'readTemperature("Tokyo")' }),
    })
    const london = addStep(getTemperature(53, "400 millis"), {
      label: "london",
      highlight: HighlightSelector.Text({ text: 'readTemperature("London")' }),
    })

    return Effect.gen(function* () {
      const mode = yield* controls.read(concurrency)
      const effects = [nyc, berlin, tokyo, london] as const

      const temperatures =
        mode === "sequential"
          ? yield* Effect.all(effects)
          : mode === "unbounded"
            ? yield* Effect.all(effects, { concurrency: "unbounded" })
            : yield* Effect.all(effects, { concurrency: 2 })

      return new TemperatureArrayResult(temperatures)
    })
  },
})
