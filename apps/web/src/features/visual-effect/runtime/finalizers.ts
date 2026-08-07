import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import {
  reduceFinalizerPanel,
  type VisualFinalizerEvent,
  type VisualFinalizerState,
} from "@/features/visual-effect/model/domain"
import { VisualFinalizers } from "@/features/visual-effect/model/example-definition"
import type { SoundManager } from "./SoundManager"
import { finalizersAtom } from "./state"

interface Registry {
  readonly update: <R, W>(
    atom: Atom.Writable<R, W>,
    update: (value: R) => W,
  ) => void
}

export const classifyFinalizerExit = <A, E>(
  exit: Exit.Exit<A, E>,
): "Succeeded" | "Failed" | "Interrupted" => {
  if (Exit.isSuccess(exit)) {
    return "Succeeded"
  }

  return Cause.hasInterruptsOnly(exit.cause) ? "Interrupted" : "Failed"
}

export const makeDispatchFinalizerEvent = (registry: Registry) => {
  return (example: ExampleDefinition, event: VisualFinalizerEvent): void => {
    registry.update(finalizersAtom(example), (state: VisualFinalizerState) =>
      reduceFinalizerPanel(state, event),
    )
  }
}

export const makeVisualFinalizers = ({
  example,
  runId,
  dispatchFinalizerEvent,
  runSync,
  soundManager,
}: {
  readonly example: ExampleDefinition
  readonly runId: number
  readonly dispatchFinalizerEvent: (
    example: ExampleDefinition,
    event: VisualFinalizerEvent,
  ) => void
  readonly runSync: (effect: Effect.Effect<void>) => void
  readonly soundManager: SoundManager["Service"]
}): VisualFinalizers["Service"] => {
  let registrationIndex = 0

  return {
    register: Effect.fn(function* (label: string) {
      const id = crypto.randomUUID()
      const at = yield* DateTime.now
      const currentIndex = registrationIndex
      registrationIndex += 1

      dispatchFinalizerEvent(example, {
        _tag: "Registered",
        runId,
        id,
        label,
        registrationIndex: currentIndex,
        at,
      })

      return id
    }),
    run: Effect.fn(function* <A, E, R>(
      id: string,
      effect: Effect.Effect<A, E, R>,
    ) {
      const startedAt = yield* DateTime.now

      dispatchFinalizerEvent(example, {
        _tag: "Started",
        runId,
        id,
        at: startedAt,
      })

      const exit = yield* Effect.exit(effect)
      const endedAt = yield* DateTime.now

      dispatchFinalizerEvent(example, {
        _tag: "Finished",
        runId,
        id,
        at: endedAt,
        phase: classifyFinalizerExit(exit),
      })

      runSync(
        soundManager.play({
          _tag: "FinalizerFinished",
          exampleKey: example.key,
          finalizerId: id,
        }),
      )

      if (Exit.isSuccess(exit)) {
        return exit.value
      }

      return yield* Effect.failCause(exit.cause)
    }),
  }
}
