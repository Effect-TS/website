import { Context, Tracer } from "effect"
import type { Exit } from "effect"
import { ExampleStep } from "../model/example-definition"

export interface StepObserver {
  /** Called when a span with an `ExampleStep` annotation starts. Returns what runs when it ends. */
  readonly start: (
    details: ExampleStep["Service"],
    startTime: bigint,
  ) => (endTime: bigint, exit: Exit.Exit<unknown, unknown>) => void
}

/**
 * Wraps a Tracer so the spans of the example steps report to the observer.
 * Other spans pass through. The wrapper reads everything else from the span,
 * so a field Effect adds later is not lost.
 */
export const observeSteps = (
  base: Tracer.Tracer,
  observer: StepObserver,
): Tracer.Tracer =>
  Tracer.make({
    span(options) {
      const span = base.span(options)
      const details = Context.getOrUndefined(span.annotations, ExampleStep)
      if (details === undefined) {
        return span
      }
      const onEnd = observer.start(details, options.startTime)
      return Object.create(span, {
        end: {
          value: (endTime: bigint, exit: Exit.Exit<unknown, unknown>) => {
            span.end(endTime, exit)
            onEnd(endTime, exit)
          },
        },
      })
    },
    context: base.context,
  })
