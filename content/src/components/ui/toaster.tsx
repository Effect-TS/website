import { component } from "@effect-rx/rx-react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "@/components/ui/toast"
import { Effect } from "effect"
import { Toaster as ToasterTag } from "@/services/toaster"

export const Toaster = component("Toaster", Effect.fnUntraced(function*() {
  const toasts = yield* ToasterTag.toasts
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} className="bg-[--sl-color-bg]" {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle className="text-[--sl-color-white]">{title}</ToastTitle>}
            {description && (
              <ToastDescription className="text-[--sl-color-text]">{description}</ToastDescription>
            )}
          </div>
          {action}
          <ToastClose className="bg-transparent text-[--sl-color-white] cursor-pointer" />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
})).provide(ToasterTag.Default)
