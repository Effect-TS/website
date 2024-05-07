import { Workspace } from "@/domain/Workspace"
import { useRxSet, useRxSuspenseSuccess } from "@effect-rx/rx-react"
import React, { Suspense } from "react"
import { WorkspaceContext } from "../context/workspace"
import { workspaceHandleRx } from "../rx/workspace"
import { FileEditor } from "./CodeEditor/FileEditor"
import { Terminal } from "./CodeEditor/Terminal"
import { TabBar } from "./CodeEditor/TabBar"
import { LoadingSpinner } from "./LoadingSpinner"
import { Panel, PanelGroup } from "react-resizable-panels"
import { PanelResizeHandle } from "./PanelResizeHandle"

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
  const setSize = useRxSet(handle.value.size)
  return (
    <WorkspaceContext.Provider value={handle.value}>
      <PanelGroup autoSaveId="editor" direction="vertical">
        <Panel>
          <TabBar />
          <FileEditor />
        </Panel>
        <PanelResizeHandle direction="horizontal" />
        <Panel onResize={setSize} defaultSize={30}>
          <Terminal />
        </Panel>
      </PanelGroup>
    </WorkspaceContext.Provider>
  )
}
