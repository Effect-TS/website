import { useRxSet } from "@effect-rx/rx-react"
import { Button } from "@/components/ui/button"
import { useWorkspaceHandle } from "../context/workspace"

export function ResetButton() {
  const handle = useWorkspaceHandle()
  const reset = useRxSet(handle.reset)

  return (
    <Button
      variant="ghost"
      className="z-10 bg-[--sl-color-bg-nav] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] border border-[--sl-color-text] text-[--sl-color-white] cursor-pointer flex-none"
      onClick={() => reset()}
    >
      Reset
    </Button>
  )
}