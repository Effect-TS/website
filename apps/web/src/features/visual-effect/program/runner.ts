import {
  Clock,
  Context,
  Duration,
  Effect,
  Fiber,
  Option,
  Queue,
  Tracer,
} from "effect"
import {
  ControlSnapshot,
  ExampleStep,
  Notifications,
  VisualFinalizers,
} from "../model/example-definition"
import { classifyFinalizerExit } from "../runtime/finalizers"
import type { ExampleDefinition } from "../model/example-definition"
import { Message } from "./message"
import { outcomeOf } from "./outcome"

/** What a run says happened. A Subscription hands these to the Program. */
export const events = Effect.runSync(Queue.unbounded<Message>())

const emit = (message: Message): void => {
  Queue.offerUnsafe(events, message)
}

const millisOf = (nanos: bigint): number => Number(nanos / 1_000_000n)

const DEFAULT_NOTIFICATION = Duration.seconds(2)

/** A stopped run still releases its finalizers, so a fiber outlives its stop. */
const fibers = new Map<number, Fiber.Fiber<unknown, unknown>>()

const stepIndexOf = (
  example: ExampleDefinition,
  details: ExampleStep["Service"],
): number => example.steps.indexOf(details.step)

export const run = (
  runId: number,
  example: ExampleDefinition,
  controls: Readonly<Record<string, string>>,
) =>
  Effect.gen(function* () {
    const baseTracer = yield* Effect.tracer
    const clock = yield* Clock.Clock
    let finalizerCount = 0

    const tracer = Tracer.make({
      span(options) {
        const span = baseTracer.span(options)
        const details = Context.getOrUndefined(span.annotations, ExampleStep)
        if (details === undefined) {
          return span
        }
        const stepIndex = stepIndexOf(example, details)
        emit(
          Message.StartedStep({
            runId,
            stepIndex,
            at: millisOf(options.startTime),
          }),
        )
        return {
          _tag: span._tag,
          name: span.name,
          spanId: span.spanId,
          traceId: span.traceId,
          parent: span.parent,
          annotations: span.annotations,
          get status() {
            return span.status
          },
          get attributes() {
            return span.attributes
          },
          links: span.links,
          sampled: span.sampled,
          kind: span.kind,
          end(endTime, exit) {
            span.end(endTime, exit)
            emit(
              Message.EndedStep({
                runId,
                stepIndex,
                at: millisOf(endTime),
                outcome: outcomeOf(exit),
              }),
            )
          },
          attribute(key, value) {
            span.attribute(key, value)
          },
          event(name, startTime, attributes) {
            span.event(name, startTime, attributes)
          },
          addLinks(links) {
            span.addLinks(links)
          },
        }
      },
      context: baseTracer.context,
    })

    const notify: (typeof Notifications.Service)["notify"] = (
      message,
      options,
    ) =>
      Effect.withFiber((fiber) => {
        const span = Context.getOrUndefined(fiber.context, Tracer.ParentSpan)
        const details =
          span?._tag === "Span"
            ? Context.getOrUndefined(span.annotations, ExampleStep)
            : undefined
        const duration = Option.fromNullishOr(options?.duration).pipe(
          Option.flatMap(Duration.fromInput),
          Option.getOrElse(() => DEFAULT_NOTIFICATION),
        )
        emit(
          Message.ShowedNotification({
            runId,
            maybeStepIndex: Option.map(Option.fromNullishOr(details), (found) =>
              stepIndexOf(example, found),
            ),
            message,
            durationMs: Duration.toMillis(duration),
            showOnHover: options?.showOnHover ?? false,
          }),
        )
        return Effect.void
      })

    const finalizers: typeof VisualFinalizers.Service = {
      register: (label) =>
        Effect.sync(() => {
          const registrationIndex = finalizerCount
          finalizerCount += 1
          const id = `finalizer-${registrationIndex}`
          emit(
            Message.ChangedFinalizers({
              runId,
              event: {
                _tag: "Registered",
                id,
                label,
                registrationIndex,
                at: clock.currentTimeMillisUnsafe(),
              },
            }),
          )
          return id
        }),
      run: (id, effect) =>
        Effect.gen(function* () {
          emit(
            Message.ChangedFinalizers({
              runId,
              event: {
                _tag: "Started",
                id,
                at: clock.currentTimeMillisUnsafe(),
              },
            }),
          )
          const exit = yield* Effect.exit(effect)
          emit(
            Message.ChangedFinalizers({
              runId,
              event: {
                _tag: "Finished",
                id,
                at: clock.currentTimeMillisUnsafe(),
                phase: classifyFinalizerExit(exit),
              },
            }),
          )
          return yield* exit
        }),
    }

    const services = Tracer.Tracer.context(tracer).pipe(
      Context.add(ControlSnapshot, {
        get: (atom) => {
          const control = example.controls.find(
            (candidate) => candidate.atom === atom,
          )
          return (
            control === undefined
              ? undefined
              : (controls[control.id] ?? control.initialValue)
          ) as never
        },
      }),
      Context.add(Notifications, { notify }),
      Context.add(VisualFinalizers, finalizers),
    )

    const startedAt = clock.currentTimeMillisUnsafe()
    emit(Message.StartedRun({ runId, at: startedAt }))

    return yield* example.program.pipe(
      Effect.provide(services),
      Effect.onExit((exit) =>
        Effect.sync(() => {
          emit(
            Message.EndedRun({
              runId,
              at: clock.currentTimeMillisUnsafe(),
              outcome: outcomeOf(exit),
            }),
          )
        }),
      ),
    )
  })

export const start = (
  runId: number,
  example: ExampleDefinition,
  controls: Readonly<Record<string, string>>,
): Effect.Effect<void> =>
  Effect.sync(() => {
    if (fibers.has(runId)) {
      return
    }
    const fiber = Effect.runFork(
      run(runId, example, controls).pipe(
        Effect.ensuring(Effect.sync(() => fibers.delete(runId))),
      ),
    )
    fibers.set(runId, fiber)
  })

/** Interrupts every run. The finalizers of a run go on after this returns. */
export const stop: Effect.Effect<void> = Effect.sync(() => {
  for (const fiber of fibers.values()) {
    Effect.runFork(Fiber.interrupt(fiber))
  }
})
