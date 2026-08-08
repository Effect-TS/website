import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"

export class Step extends Data.Class<{
  readonly id: number
  readonly message: string
  readonly done: boolean
}> {
  complete(): Step {
    return new Step({ ...this, done: true })
  }
}

export const loaderStepsAtom = Atom.make(Array.empty<Step>())

export class Loader extends Context.Service<Loader>()("app/Loader", {
  make: Effect.gen(function* () {
    const registry = yield* AtomRegistry.AtomRegistry
    const counter = yield* Ref.make(0)
    const queue = yield* Queue.unbounded<[number, Duration.Input] | null>()

    const nextId = Ref.getAndUpdate(counter, (n) => n + 1).pipe(
      Effect.map((n) => n % Number.MAX_SAFE_INTEGER),
    )

    function addStep(id: number, message: string) {
      return Effect.sync(() =>
        registry.update(
          loaderStepsAtom,
          Array.append(new Step({ id, message, done: false })),
        ),
      )
    }

    function withIndicator(message: string, minWaitTime: Duration.Input = 0) {
      return <A, E, R>(self: Effect.Effect<A, E, R>) =>
        nextId.pipe(
          Effect.tap((id) => addStep(id, message)),
          Effect.flatMap((id) =>
            Effect.timed(self).pipe(
              Effect.tap(([duration]) => {
                const delta = Duration.subtract(
                  Duration.fromInputUnsafe(minWaitTime),
                  duration,
                )
                return Queue.offer(queue, [id, delta])
              }),
              Effect.map(([, value]) => value),
            ),
          ),
        )
    }

    const finish = nextId.pipe(
      Effect.tap((id) => addStep(id, "Starting playground")),
      Effect.flatMap((id) =>
        Queue.offer(queue, [id, 0] as const).pipe(
          Effect.andThen(Queue.offer(queue, null)),
        ),
      ),
    )

    function completeStep(id: number) {
      return (step: Step) => (id === step.id ? step.complete() : step)
    }

    const fiber = yield* Stream.fromQueue(queue).pipe(
      Stream.takeWhile((element) => element !== null),
      Stream.runForEach(([id, delay]) =>
        Effect.sync(() =>
          registry.update(loaderStepsAtom, Array.map(completeStep(id))),
        ).pipe(Effect.delay(delay)),
      ),
      Effect.forkScoped,
      Effect.uninterruptible,
    )

    return {
      finish,
      await: Fiber.join(fiber),
      withIndicator,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
