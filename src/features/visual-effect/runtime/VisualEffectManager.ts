import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberMap from "effect/FiberMap"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Tracer from "effect/Tracer"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import { InitialState, VisualEffectState } from "@/features/visual-effect/model/domain"
import {
  ControlSnapshot,
  ExampleStep,
  Notifications,
  VisualFinalizers,
} from "@/features/visual-effect/model/example-definition"
import { SoundManager } from "@/features/visual-effect/runtime/SoundManager"
import { makeDispatchFinalizerEvent, makeVisualFinalizers } from "./finalizers"
import { exitToState, setStateNotification } from "./notifications"
import { playExampleTransition, playStepTransition } from "./sound-transitions"
import {
  exampleStateAtom,
  scheduleTimeAtom,
  scheduleTimelineAtom,
  stepStateAtom,
  type ResetOptions,
} from "./state"
import { scheduleTimer, updateScheduleTimeline } from "./timeline"

export class VisualEffectManager extends Context.Service<
  VisualEffectManager,
  {
    start: (example: ExampleDefinition) => Effect.Effect<void>
    stop: (example: ExampleDefinition) => Effect.Effect<void>
    reset: (example: ExampleDefinition, options?: ResetOptions) => Effect.Effect<void>
  }
>()("VisualEffectManager") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* () {
      const clock = yield* Clock.Clock
      const tracer = yield* Effect.tracer
      const registry = yield* AtomRegistry.AtomRegistry
      const soundManager = yield* SoundManager
      const fiberMap = yield* FiberMap.make<ExampleDefinition>()
      const services = yield* Effect.context()
      const runSync = Effect.runSyncWith(services)
      const resettingExamples = new Set<string>()
      const exampleRunIds = new Map<string, number>()
      const dispatchFinalizerEvent = makeDispatchFinalizerEvent(registry)

      const setExampleState = (
        example: ExampleDefinition,
        current: VisualEffectState,
      ): Effect.Effect<void> => {
        const atom = exampleStateAtom(example)
        const previous = registry.get(atom)
        registry.set(atom, current)

        return playExampleTransition(soundManager, resettingExamples, example, previous, current)
      }

      const setStepState = (details: ExampleStep["Service"], state: VisualEffectState): void => {
        const atom = stepStateAtom(details.step)
        const previous = registry.get(atom)
        registry.set(atom, state)

        runSync(playStepTransition(soundManager, resettingExamples, details, previous, state))

        if (details.step.addToTimeline) {
          updateScheduleTimeline(registry, details, state)
        }
      }

      const setStepNotification = (
        details: ExampleStep["Service"],
        message: string,
        attributes: Record<string, unknown> | undefined,
      ): void => {
        const atom = stepStateAtom(details.step)
        const previous = registry.get(atom)
        registry.set(atom, setStateNotification(previous, message, attributes))
      }

      const setExampleNotification = (
        example: ExampleDefinition,
        message: string,
        attributes: Record<string, unknown> | undefined,
      ): void => {
        const atom = exampleStateAtom(example)
        const previous = registry.get(atom)
        registry.set(atom, setStateNotification(previous, message, attributes))
      }

      const nextRunId = (example: ExampleDefinition): number => {
        const previous = exampleRunIds.get(example.key) ?? 0
        const next = previous + 1
        exampleRunIds.set(example.key, next)
        return next
      }

      const startVisualSpan = (details: ExampleStep["Service"], startedAt: DateTime.Utc): void => {
        setStepState(
          details,
          VisualEffectState.Running({
            notification: Option.none(),
            startedAt,
          }),
        )
      }

      const endVisualSpan = (
        details: ExampleStep["Service"],
        startedAt: DateTime.Utc,
        endedAt: DateTime.Utc,
        exit: Exit.Exit<unknown, unknown>,
      ): void => {
        const previous = registry.get(stepStateAtom(details.step))
        setStepState(details, exitToState(exit, startedAt, endedAt, previous))
      }

      const visualEffectTracer = Tracer.make({
        span(options) {
          const span = tracer.span(options)
          const details = Context.getOrUndefined(span.annotations, ExampleStep)

          if (!details) {
            return span
          }

          const startTime = dateTimeFromNanos(options.startTime)
          startVisualSpan(details, startTime)

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
              endVisualSpan(details, startTime, dateTimeFromNanos(endTime), exit)
            },
            attribute(key, value) {
              span.attribute(key, value)
            },
            event(name, startTime, attributes) {
              span.event(name, startTime, attributes)
              setStepNotification(details, name, attributes)
            },
            addLinks(links) {
              span.addLinks(links)
            },
          }
        },
        context: tracer.context,
      })

      const defaultNotificationDuration = Duration.seconds(2)

      const notifyForExample =
        (example: ExampleDefinition): (typeof Notifications.Service)["notify"] =>
        (message, options) =>
          Effect.withFiber((fiber) => {
            const span = fiber.currentSpan
            const duration = options?.duration
              ? (Duration.fromInput(options.duration) ?? defaultNotificationDuration)
              : defaultNotificationDuration
            const attributes = {
              duration,
              showOnHover: options?.showOnHover ?? false,
            } satisfies Record<string, unknown>

            if (!span || span._tag !== "Span") {
              setExampleNotification(example, message, attributes)
              return Effect.void
            }

            const details = Context.getOrUndefined(span.annotations, ExampleStep)

            if (details === undefined) {
              setExampleNotification(example, message, attributes)
              return Effect.void
            }

            span.event(message, clock.currentTimeNanosUnsafe(), attributes)
            return Effect.void
          })

      const manager = VisualEffectManager.of({
        start: Effect.fnUntraced(function* (example) {
          const startedAt = yield* DateTime.now
          const startedAtMillis = DateTime.toEpochMillis(startedAt)
          const snapshot = ControlSnapshot.of({
            get: (atom) => registry.get(atom),
          })
          const notify = notifyForExample(example)

          const program = Effect.gen(function* () {
            const runId = nextRunId(example)
            const startState = VisualEffectState.Running({
              startedAt,
              notification: Option.none(),
            })

            dispatchFinalizerEvent(example, {
              _tag: "RunStarted",
              runId,
            })

            if (example.features.timeline) {
              registry.set(scheduleTimeAtom(example), startedAtMillis)
            }

            yield* setExampleState(example, startState)

            const services = Context.make(ControlSnapshot, snapshot).pipe(
              Context.add(Notifications, { notify }),
              Context.add(
                VisualFinalizers,
                makeVisualFinalizers({
                  example,
                  runId,
                  dispatchFinalizerEvent,
                  runSync,
                  soundManager,
                }),
              ),
            )

            const fiber = yield* example.program.pipe(
              Effect.provide(services),
              Effect.onExit(
                Effect.fnUntraced(function* (exit) {
                  const endedAt = yield* DateTime.now
                  const currentState = registry.get(exampleStateAtom(example))
                  yield* setExampleState(
                    example,
                    exitToState(exit, startedAt, endedAt, currentState),
                  )
                }),
              ),
              Effect.forkChild,
            )

            if (example.features.timeline) {
              yield* Effect.forkChild(scheduleTimer(clock, registry, example))
            }

            return yield* Fiber.join(fiber)
          })

          yield* FiberMap.run(fiberMap, example, program, {
            startImmediately: true,
            onlyIfMissing: true,
          })
        }),
        stop: Effect.fnUntraced(function* (example) {
          yield* FiberMap.remove(fiberMap, example)
        }),
        reset: (example, options) =>
          Effect.acquireUseRelease(
            Effect.sync(() => resettingExamples.add(example.key)),
            Effect.fnUntraced(function* () {
              yield* FiberMap.remove(fiberMap, example)
              registry.set(exampleStateAtom(example), InitialState)

              for (const step of example.steps) {
                registry.set(stepStateAtom(step), InitialState)
              }

              registry.set(scheduleTimelineAtom(example), [])
              dispatchFinalizerEvent(example, {
                _tag: "Reset",
                runId: nextRunId(example),
              })

              if (options?.silent !== true) {
                yield* soundManager.play({
                  _tag: "ExampleReset",
                  exampleKey: example.key,
                })
              }
            }),
            () => Effect.sync(() => resettingExamples.delete(example.key)),
          ),
      })

      return Tracer.Tracer.context(visualEffectTracer).pipe(
        Context.add(VisualEffectManager, manager),
      )
    }),
  )
}

const dateTimeFromNanos = (nanos: bigint): DateTime.Utc => {
  return DateTime.makeUnsafe(nanosToMilliseconds(nanos))
}

const nanosToMilliseconds = (nanos: bigint): number => Number(nanos / 1_000_000n)
