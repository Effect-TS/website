import { Result, Rx } from "@effect-rx/rx-react"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { Loader, Step } from "../services/loader"

const runtime = Rx.runtime(Loader.Default)

export const isLoadedRx = runtime.rx(Loader.pipe(Effect.flatMap((loader) => loader.await)))

export const stepsRx = pipe(
  runtime.subscriptionRef(Loader.pipe(Effect.map((loader) => loader.steps))),
  Rx.map(Result.getOrElse(() => Array.empty<Step>()))
)
