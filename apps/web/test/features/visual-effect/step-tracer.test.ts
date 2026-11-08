import { Context, Effect, Tracer } from "effect"
import { expect, test } from "vite-plus/test"
import { ExampleStep } from "../../../src/features/visual-effect/model/example-definition.ts"
import { observeSteps } from "../../../src/features/visual-effect/program/step-tracer.ts"

const details = { definition: {}, step: {} } as ExampleStep["Service"]

/** Runs two spans through the wrapped Tracer and returns what the observer saw. */
const observe = (annotated: boolean) => {
  const seen: Array<string> = []
  const tracer = observeSteps(
    Tracer.make({ span: (options) => new Tracer.NativeSpan(options) }),
    {
      start: () => {
        seen.push("start")
        return () => seen.push("end")
      },
    },
  )
  const annotations = annotated
    ? Context.make(ExampleStep, details)
    : Context.empty()
  return Effect.runPromise(
    Effect.void.pipe(
      Effect.withSpan("step", { annotations }),
      Effect.provideService(Tracer.Tracer, tracer),
    ),
  ).then(() => seen)
}

test("reports the start and end of a span with an ExampleStep", async () => {
  expect(await observe(true)).toEqual(["start", "end"])
})

test("ignores a span without an ExampleStep", async () => {
  expect(await observe(false)).toEqual([])
})
