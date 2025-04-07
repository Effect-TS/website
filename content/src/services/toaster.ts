import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"
import {ReactiveRef} from "@effect-rx/rx-react"

export interface Toast extends ToastProps {
  readonly id: string
  readonly title?: string
  readonly description?: React.ReactNode
  readonly action?: ToastActionElement
}

export class Toaster extends Effect.Service<Toaster>()("app/Toaster", {
  accessors: true,
  scoped: Effect.gen(function*() {
    const counter = yield* Ref.make(0)
    const toasts = yield* ReactiveRef.make(Array.empty<Toast>())
    const removeQueue = yield* Queue.unbounded<string>()

    const nextId = Ref.getAndUpdate(counter, (n) => n + 1).pipe(
      Effect.map((n) => (n % Number.MAX_SAFE_INTEGER).toString())
    )

    function createToast(id: string, toast: Omit<Toast, "id">): Toast {
      return {
        ...toast,
        id,
        open: true,
        onOpenChange: (open) => !open && Effect.runSync(dismissToast(id))
      }
    }

    function addToast(toast: Omit<Toast, "id">) {
      return nextId.pipe(
        Effect.flatMap((id) =>
          ReactiveRef.update(toasts, Array.prepend(createToast(id, toast)))
        )
      )
    }

    function removeToast(id: string) {
      return ReactiveRef.update(
        toasts,
        Array.filter((toast) => toast.id !== id)
      )
    }

    function dismissToast(id: string) {
      Queue.unsafeOffer(removeQueue, id)
      return ReactiveRef.update(
        toasts,
        Array.map((toast) =>
          toast.id === id ? { ...toast, open: false } : toast
        )
      )
    }

    yield* Queue.take(removeQueue).pipe(
      Effect.flatMap((id) =>
        removeToast(id).pipe(Effect.delay("5 seconds"), Effect.fork)
      ),
      Effect.forever,
      Effect.forkScoped,
      Effect.interruptible
    )

    return {
      toast: addToast,
      toasts
    } as const
  })
}) {}
