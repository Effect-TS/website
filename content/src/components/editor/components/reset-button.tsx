import { useRxSet } from "@effect-rx/rx-react"
import { resetRx } from "../rx/import"
import { useWorkspaceHandle } from "../context/workspace"
import { Button } from "@/components/ui/button"

export function ResetButton() {
  const handle = useWorkspaceHandle()
  const reset = useRxSet(resetRx)
  return (
    <Button
      className="bg-[--sl-color-bg-nav] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] border border-[--sl-color-text] text-[--sl-color-white] cursor-pointer"
      onClick={() => reset(handle)}
    >
      Reset
    </Button>
  )
}
