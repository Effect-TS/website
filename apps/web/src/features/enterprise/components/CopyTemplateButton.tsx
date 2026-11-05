import { useAtom } from "@effect/atom-react"
import { CircleCheck, ClipboardList } from "lucide-react"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { buttonLinkVariants } from "@/components/ui/button-link"
import { copyTemplateAtom } from "@/features/enterprise/atoms"

export default function CopyTemplateButton({
  text,
  label,
  className,
}: {
  readonly text: string
  readonly label: string
  readonly className?: string
}) {
  const [result, copy] = useAtom(copyTemplateAtom)
  const copied = AsyncResult.isSuccess(result)

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={buttonLinkVariants({ variant: "primary", className })}
    >
      {copied ? (
        <CircleCheck size={16} aria-hidden="true" />
      ) : (
        <ClipboardList size={16} aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  )
}
