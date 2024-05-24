import { useWorkspaceHandle } from "@/workspaces/context"
import { shareRx } from "./rx"
import { useMemo } from "react"

export const useShareRx = () => {
  const handle = useWorkspaceHandle()
  return useMemo(() => shareRx(handle), [handle])
}
