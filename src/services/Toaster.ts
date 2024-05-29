import {
  Effect,
  Layer,
  Queue,
  Ref,
  Array,
  SubscriptionRef,
  pipe
} from "effect"
import { ToastActionElement, ToastProps } from "@/components/ui/toast"

export interface Toast extends ToastProps {
  readonly id: string
  readonly title?: string
  readonly description?: React.ReactNode
  readonly action?: ToastActionElement
}

const make = Effect.gen(function* () {
  const counter = yield* Ref.make(0)
  const toasts = yield* SubscriptionRef.make(Array.empty<Toast>())
  const removeQueue = yield* Queue.unbounded<string>()

  const nextId = Ref.getAndUpdate(counter, (n) => n + 1).pipe(
    Effect.map((n) => (n % Number.MAX_SAFE_INTEGER).toString())
  )

  function createToast(id: string, toast: Omit<Toast, "id">): Toast {
    return {
      ...toast,
      id,
      open: true,
      onOpenChange: (open) => !open && Effect.runPromise(dismissToast(id))
    }
  }

  function addToast(toast: Omit<Toast, "id">) {
    return nextId.pipe(
      Effect.flatMap((id) =>
        Ref.update(toasts, Array.prepend(createToast(id, toast)))
      )
    )
  }

  function removeToast(id: string) {
    return Ref.update(
      toasts,
      Array.filter((toast) => toast.id !== id)
    )
  }

  function dismissToast(id: string) {
    Queue.unsafeOffer(removeQueue, id)
    return Ref.update(
      toasts,
      Array.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    )
  }

  yield* Queue.take(removeQueue).pipe(
    Effect.flatMap((id) =>
      pipe(removeToast(id), Effect.delay("5 seconds"), Effect.fork)
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

export class Toaster extends Effect.Tag("app/Toaster")<
  Toaster,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make)
}
