import React from "react"
import { Workspace } from "@/services/WebContainer"
import { WorkspaceContext } from "../context/workspace"
import { FileEditor } from "./FileEditor"
import { TabBar } from "./TabBar"
import { Terminal } from "./Terminal"

export declare namespace CodeEditor {
  export interface Props {
    readonly workspace: Workspace
  }
}

export const CodeEditor: React.FC<CodeEditor.Props> = ({ workspace }) => {
  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="h-2/3 flex flex-col">
        <TabBar />
        <FileEditor />
      </div>
      <div className="h-1/3">
        <Terminal workspace={workspace} />
      </div>
    </WorkspaceContext.Provider>
  )
}

CodeEditor.displayName = "Editor"