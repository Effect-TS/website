import * as Effect from "effect/Effect"
import * as String from "effect/String"
import { VisualEffectSegmentedControl } from "@/features/visual-effect/components/VisualEffectSegmentedControl"
import type { ControlRenderProps } from "../model/example-definition"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { ErrorResult } from "../ui/results/error"
import { PrimitiveResult } from "../ui/results/primitive"

type ProgramOutcome = "succeed" | "fail" | "die" | "interrupt"

const PROGRAM_OUTCOMES: ReadonlyArray<ProgramOutcome> = [
  "succeed",
  "fail",
  "die",
  "interrupt",
]

function ProgramOutcomeControl({
  control,
}: ControlRenderProps<ProgramOutcome>) {
  return (
    <VisualEffectSegmentedControl
      control={control}
      options={PROGRAM_OUTCOMES}
    />
  )
}

const getCommentCodeSnippet = (outcome: ProgramOutcome): string => {
  switch (outcome) {
    case "succeed":
      return "// Succeed"
    case "fail":
      return "// Fail"
    case "die":
      return "// Die"
    case "interrupt":
      return "// Keep running until interrupted"
  }
}

const getOutcomeCodeSnippet = (outcome: ProgramOutcome): string => {
  switch (outcome) {
    case "succeed":
      return 'return "Done"'
    case "fail":
      return 'return yield* Effect.fail("Boom")'
    case "die":
      return 'return yield* Effect.die("Internal Server Error")'
    case "interrupt":
      return 'return yield* Effect.sleep("24 hours")'
  }
}

const getCodeSnippet = (outcome: ProgramOutcome): string =>
  String.stripMargin(
    `|const program = Effect.gen(function* () {
     |  // Register finalizer first
     |  yield* Effect.addFinalizer(() => console.log("cleanup"))
     |  ${getCommentCodeSnippet(outcome)}
     |  ${getOutcomeCodeSnippet(outcome)}
     |})
     |
     |const result = Effect.scoped(program)`,
  )

export const addFinalizerExample = defineExample({
  label: "Effect.addFinalizer",
  description: "Register cleanup actions in a scope",
  features: { finalizers: true },
  code: {
    language: "typescript",
    source: getCodeSnippet("succeed"),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.scoped(program)",
  }),
  build: ({ addStep, controls, finalizers, snippet }) => {
    const outcome = controls.register<ProgramOutcome>({
      id: "outcome",
      label: "Outcome",
      description: "Changing the outcome resets the current run.",
      initialValue: "succeed",
      render: ProgramOutcomeControl,
    })

    snippet.setCode(({ get }) => ({
      language: "typescript",
      source: getCodeSnippet(get(outcome)),
    }))

    const program = Effect.gen(function* () {
      const notifications = yield* Notifications
      const mode = yield* controls.read(outcome)

      yield* finalizers.add("Clean up", Effect.sleep("800 millis"))

      yield* Effect.sleep("700 millis")

      switch (mode) {
        case "succeed":
          return new PrimitiveResult("Done")
        case "fail":
          return yield* Effect.fail(new ErrorResult("Boom")).pipe(
            Effect.tapError((error) =>
              notifications.notify(error.message, {
                showOnHover: true,
              }),
            ),
          )
        case "die":
          return yield* Effect.die(new Error("Internal Server Error")).pipe(
            Effect.tapDefect((defect) =>
              notifications.notify(
                defect instanceof Error ? defect.message : "Died",
                {
                  showOnHover: true,
                },
              ),
            ),
          )
        case "interrupt": {
          yield* Effect.sleep("2 seconds")
          yield* notifications.notify("⚠️ Interrupt Me! ⚠️", {
            duration: "365 days",
          })
          return yield* Effect.never.pipe(
            Effect.as(new PrimitiveResult("Never Happens")),
          )
        }
      }
    })

    const programStep = addStep(program, {
      label: "program",
      highlight: HighlightSelector.LineRange({ startLine: 1, endLine: 6 }),
    })

    return Effect.scoped(programStep)
  },
})
