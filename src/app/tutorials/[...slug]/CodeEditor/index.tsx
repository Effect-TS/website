import React from "react"
import { Workspace } from "@/services/WebContainer"
import { WorkspaceContext } from "../context/workspace"
import { FileEditors } from "./FileEditors"
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
      <div className="flex flex-col">
        <div className="h-2/3">
          <TabBar />
          <FileEditors />
        </div>
        <div className="h-1/3 flex">
          <Terminal workspace={workspace} />
        </div>
      </div>
    </WorkspaceContext.Provider>
  )
}

CodeEditor.displayName = "Editor"