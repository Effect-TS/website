import React from "react"
import { useRxValue, Result } from "@effect-rx/rx-react"
import { type Workspace } from "@/services/WebContainer"
import { workspaceRx } from "../rx/workspace"

export const WorkspaceContext = React.createContext<Workspace>(null as any)

export const useFiles = () => {
  const workspace = React.useContext(WorkspaceContext)
  const result = useRxValue(workspaceRx(workspace).files)
  return Result.isSuccess(result) ? result.value : []
}