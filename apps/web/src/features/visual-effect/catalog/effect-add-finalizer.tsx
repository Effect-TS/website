import { useAtomValue } from "@effect/atom-react"
import * as Effect from "effect/Effect"
import * as String from "effect/String"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsIndicator } from "@/components/ui/tabs-indicator"
import { useControlWrite } from "@/features/visual-effect/components/VisualEffectProvider"
import { useTabsIndicator } from "@/hooks/useTabsIndicator"
import { cn } from "@/lib/utils"
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
  const value = useAtomValue(control.atom)
  const setValue = useControlWrite(control)
  const { indicatorRect, rootRef } = useTabsIndicator(value)

  return (
    <div ref={rootRef} className="flex items-center justify-start gap-3">
      <span className="font-mono tracking-wider text-neutral-500 select-none">
        OUTCOME
      </span>
      <Tabs value={value} onValueChange={(value) => setValue(value)}>
        <TabsList className="relative isolate gap-3 overflow-hidden border border-zinc-700 bg-zinc-900 p-1 group-data-[orientation=horizontal]/tabs:h-11">
          <TabsIndicator
            rect={indicatorRect}
            variant="fill"
            className="rounded-md bg-zinc-950"
          />

          {PROGRAM_OUTCOMES.map((option) => (
            <TabsTrigger
              key={option}
              className={cn(
                "relative z-10 cursor-pointer border-none px-3 text-center font-mono shadow-none",
                "bg-transparent data-active:border-transparent data-active:bg-transparent data-active:font-semibold data-active:shadow-none",
                "dark:data-active:border-transparent dark:data-active:bg-transparent",
                "group-data-[variant=default]/tabs-list:data-active:shadow-none",
              )}
              value={option}
            >
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
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
