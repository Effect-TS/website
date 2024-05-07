import { Workspace } from "@/domain/Workspace"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import React from "react"
import { WorkspaceContext } from "../context/workspace"
import { workspaceHandleRx } from "../rx/workspace"
import { FileEditor } from "./CodeEditor/FileEditor"
import { Terminal } from "./CodeEditor/Terminal"

export declare namespace CodeEditor {
  export interface Props {
    readonly workspace: Workspace
  }
}

export const CodeEditor: React.FC<CodeEditor.Props> = ({ workspace }) => {
  const handle = useRxSuspenseSuccess(workspaceHandleRx(workspace))
  return (
    <WorkspaceContext.Provider value={handle.value}>
      <div className="h-2/3 flex flex-col">
        <FileEditor />
      </div>
      <div className="h-1/3">
        <Terminal />
      </div>
    </WorkspaceContext.Provider>
  )
}

CodeEditor.displayName = "Editor"
