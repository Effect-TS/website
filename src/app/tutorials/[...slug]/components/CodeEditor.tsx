import { Workspace } from "@/domain/Workspace"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import React, { Suspense } from "react"
import { WorkspaceContext } from "../context/workspace"
import { workspaceHandleRx } from "../rx/workspace"
import { FileEditor } from "./CodeEditor/FileEditor"
import { Terminal } from "./CodeEditor/Terminal"
import { TabBar } from "./CodeEditor/TabBar"
import { LoadingSpinner } from "./LoadingSpinner"

export function CodeEditor({ workspace }: { readonly workspace: Workspace }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CodeEditorSuspended workspace={workspace} />
    </Suspense>
  )
}

function CodeEditorSuspended({
  workspace
}: {
  readonly workspace: Workspace
}) {
  const handle = useRxSuspenseSuccess(workspaceHandleRx(workspace))
  return (
    <WorkspaceContext.Provider value={handle.value}>
      <div className="h-2/3 flex flex-col">
        <TabBar />
        <FileEditor />
      </div>
      <div className="h-1/3">
        <Terminal />
      </div>
    </WorkspaceContext.Provider>
  )
}
