import { Registry, Rx } from "@effect-rx/rx-react"
import * as Array from "effect/Array"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"

export class Step extends Data.Class<{
  readonly id: number
  readonly message: string
  readonly done: boolean
}> {
  complete(): Step {
    return new Step({ ...this, done: true })
  }
}

export const loaderStepsRx = Rx.make(Array.empty<Step>())

export class Loader extends Effect.Service<Loader>()("app/Loader", {
  scoped: Effect.gen(function* () {
    const counter = yield* Ref.make(0)
    const queue = yield* Queue.unbounded<
      [number, Duration.DurationInput] | null
    >()

    const nextId = Ref.getAndUpdate(counter, (n) => n + 1).pipe(
      Effect.map((n) => n % Number.MAX_SAFE_INTEGER)
    )

    function addStep(id: number, message: string) {
      return Rx.update(
        loaderStepsRx,
        Array.append(new Step({ id, message, done: false }))
      )
    }

    function withIndicator(
      message: string,
      minWaitTime: Duration.DurationInput = 0
    ) {
      return <A, E, R>(
        self: Effect.Effect<A, E, R>
      ): Effect.Effect<A, E, R | Registry.RxRegistry> =>
        nextId.pipe(
          Effect.tap((id) => addStep(id, message)),
          Effect.flatMap((id) =>
            Effect.timed(self).pipe(
              Effect.tap(([duration]) => {
                const delta = Duration.subtract(minWaitTime, duration)
                return Queue.offer(queue, [id, delta])
              }),
              Effect.map(([, value]) => value)
            )
          )
        )
    }

    const finish = nextId.pipe(
      Effect.tap((id) => addStep(id, "Starting playground")),
      Effect.flatMap((id) => Queue.offerAll(queue, [[id, 0], null]))
    )

    function completeStep(id: number) {
      return (step: Step) => (id === step.id ? step.complete() : step)
    }

    const fiber = yield* Stream.fromQueue(queue).pipe(
      Stream.takeWhile((element) => element !== null),
      Stream.runForEach(([id, delay]) =>
        Rx.update(loaderStepsRx, Array.map(completeStep(id))).pipe(
          Effect.delay(delay)
        )
      ),
      Effect.forkScoped,
      Effect.uninterruptible
    )

    return {
      finish,
      await: fiber.await,
      withIndicator
    } as const
  })
}) {}
