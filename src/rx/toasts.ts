import { Toaster } from "@/services/Toaster"
import { Rx } from "@effect-rx/rx-react"

export const toastRuntime = Rx.runtime(Toaster.Live)

export const toastsRx = toastRuntime.subscriptionRef(Toaster.toasts)
