import { Toaster } from "@/services/Toaster"
import { Result, Rx } from "@effect-rx/rx-react"
import { pipe } from "effect"

export const toastRuntime = Rx.runtime(Toaster.Live)

export const toastsRx = pipe(
  toastRuntime.subscriptionRef(Toaster.toasts),
  Rx.map(Result.getOrElse(() => []))
)
