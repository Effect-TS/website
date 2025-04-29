import { Result, Rx } from "@effect-rx/rx-react"
import * as Effect from "effect/Effect"
import { Loader } from "../services/loader"

const runtime = Rx.runtime(Loader.Default)

export const isLoadedRx = runtime
  .rx(Loader.pipe(Effect.flatMap((loader) => loader.await)))
  .pipe(Rx.map(Result.isSuccess))
