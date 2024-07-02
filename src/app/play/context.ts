import { useWorkspaceHandle } from "@/workspaces/context/workspace"
import { shareRx } from "./rx"
import { useMemo } from "react"

export const useShareRx = () => {
  const handle = useWorkspaceHandle()
  return useMemo(() => shareRx(handle), [handle])
}
