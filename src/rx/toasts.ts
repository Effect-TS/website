import { Toaster } from "@/services/Toaster"
import { Result, Rx } from "@effect-rx/rx-react"
import { Effect, pipe } from "effect"

export const toastRuntime = Rx.runtime(Toaster.Live)

export const toasterRx = toastRuntime.fn(Toaster.toast)

export const toastsRx = pipe(
  toastRuntime.subscriptionRef(Toaster.pipe(Effect.map((toaster) => toaster.toasts))),
  Rx.map(Result.getOrElse(() => []))
)
