import { useAtomValue } from "@effect-atom/atom-react"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { toastsAtom } from "@/services/toaster"

export function Toaster() {
  const toasts = useAtomValue(toastsAtom)

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} className="bg-[--sl-color-bg]" {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle className="text-[--sl-color-white]">{title}</ToastTitle>}
            {description && <ToastDescription className="text-[--sl-color-text]">{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose className="bg-transparent text-[--sl-color-white] cursor-pointer" />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
