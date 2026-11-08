import {
  Array,
  Clock,
  Context,
  Duration,
  Effect,
  Fiber,
  Layer,
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
import { observeSteps } from "./step-tracer"

const millisOf = (nanos: bigint): number => Number(nanos / 1_000_000n)

const DEFAULT_NOTIFICATION = Duration.seconds(2)

const stepIndexOf = (
  example: ExampleDefinition,
  details: ExampleStep["Service"],
): number =>
  Array.findFirstIndex(example.steps, (step) => step === details.step).pipe(
    Option.getOrElse(() => -1),
  )

export const run = (
  emit: (message: Message) => void,
  runId: number,
  example: ExampleDefinition,
  controls: Readonly<Record<string, string>>,
) =>
  Effect.gen(function* () {
    const baseTracer = yield* Effect.tracer
    const clock = yield* Clock.Clock
    let finalizerCount = 0

    const tracer = observeSteps(baseTracer, {
      start: (details, startTime) => {
        const stepIndex = stepIndexOf(example, details)
        emit(
          Message.StartedStep({
            runId,
            stepIndex,
            at: millisOf(startTime),
          }),
        )
        return (endTime, exit) => {
          emit(
            Message.EndedStep({
              runId,
              stepIndex,
              at: millisOf(endTime),
              outcome: outcomeOf(exit),
            }),
          )
        }
      },
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
            Message.UpdatedFinalizers({
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
            Message.UpdatedFinalizers({
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
            Message.UpdatedFinalizers({
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
          const control = Array.findFirst(
            example.controls,
            (candidate) => candidate.atom === atom,
          )
          // NOTE: Every control atom holds a string, but the reader is generic over the atom.
          return Option.match(control, {
            onNone: () => undefined,
            onSome: ({ id, initialValue }) => controls[id] ?? initialValue,
          }) as never
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

/**
 * The runs of one Program. Its Commands start and stop runs, and its
 * Subscription reads `events`. A Program provides its own session through
 * `resources`, so two Programs on a page never share runs.
 */
export class RunSession extends Context.Service<
  RunSession,
  {
    /** What the runs say happened. The Messages carry a `runId`, so a late one is ignored. */
    readonly events: Queue.Queue<Message>
    readonly start: (
      runId: number,
      example: ExampleDefinition,
      controls: Readonly<Record<string, string>>,
    ) => Effect.Effect<void>
    /** Interrupts every run. The finalizers of a run go on after this returns. */
    readonly stop: Effect.Effect<void>
  }
>()("RunSession") {
  static readonly layer = Layer.effect(
    RunSession,
    Effect.gen(function* () {
      const events = yield* Queue.unbounded<Message>()
      const emit = (message: Message): void => {
        Queue.offerUnsafe(events, message)
      }
      // A stopped run still releases its finalizers, so a fiber outlives its stop.
      const fibers = new Map<number, Fiber.Fiber<unknown, unknown>>()
      const stop = Effect.sync(() => {
        for (const fiber of fibers.values()) {
          Effect.runFork(Fiber.interrupt(fiber))
        }
      })
      yield* Effect.addFinalizer(() => stop)
      return RunSession.of({
        events,
        stop,
        start: (runId, example, controls) =>
          Effect.sync(() => {
            if (fibers.has(runId)) {
              return
            }
            const fiber = Effect.runFork(
              run(emit, runId, example, controls).pipe(
                Effect.ensuring(Effect.sync(() => fibers.delete(runId))),
              ),
            )
            fibers.set(runId, fiber)
          }),
      })
    }),
  )
}
