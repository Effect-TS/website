import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"
import { Registry, Rx } from "@effect-rx/rx-react"
import { Runtime } from "effect"

export interface Toast extends ToastProps {
  readonly id: string
  readonly title?: string
  readonly description?: React.ReactNode
  readonly action?: ToastActionElement
}

export const toastsRx = Rx.make(Array.empty<Toast>())

export class Toaster extends Effect.Service<Toaster>()("app/Toaster", {
  scoped: Effect.gen(function* () {
    const counter = yield* Ref.make(0)
    const removeQueue = yield* Queue.unbounded<string>()
    const runtime = yield* Effect.runtime<Registry.RxRegistry>()

    const nextId = Ref.getAndUpdate(counter, (n) => n + 1).pipe(
      Effect.map((n) => (n % Number.MAX_SAFE_INTEGER).toString())
    )

    function createToast(id: string, toast: Omit<Toast, "id">): Toast {
      return {
        ...toast,
        id,
        open: true,
        onOpenChange: (open) => !open && Runtime.runSync(runtime, dismissToast(id))
      }
    }

    function addToast(toast: Omit<Toast, "id">) {
      return nextId.pipe(Effect.flatMap((id) => Rx.update(toastsRx, Array.prepend(createToast(id, toast)))))
    }

    function removeToast(id: string) {
      return Rx.update(
        toastsRx,
        Array.filter((toast) => toast.id !== id)
      )
    }

    function dismissToast(id: string) {
      Queue.unsafeOffer(removeQueue, id)
      return Rx.update(
        toastsRx,
        Array.map((toast) => (toast.id === id ? { ...toast, open: false } : toast))
      )
    }

    yield* Queue.take(removeQueue).pipe(
      Effect.flatMap((id) => removeToast(id).pipe(Effect.delay("5 seconds"), Effect.fork)),
      Effect.forever,
      Effect.forkScoped,
      Effect.interruptible
    )

    return {
      toast: addToast
    } as const
  })
}) {}
