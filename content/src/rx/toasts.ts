import { Toaster, type Toast } from "@/services/toaster"
import { Result, Rx } from "@effect-rx/rx-react"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

export const toastRuntime = Rx.runtime(Toaster.Default)

export const toasterRx = toastRuntime.fn((toast: Omit<Toast, "id">) =>
  Toaster.pipe(Effect.flatMap((toaster) => toaster.toast(toast)))
)

export const toastsRx = pipe(
  toastRuntime.subscriptionRef(Toaster.pipe(Effect.map((toaster) => toaster.toasts))),
  Rx.map(Result.getOrElse(() => []))
)
