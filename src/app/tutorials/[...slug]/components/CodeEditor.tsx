import { Workspace } from "@/domain/Workspace"
import { useRxSet, useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Option } from "effect"
import { Suspense, useEffect } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { WorkspaceContext } from "../context/WorkspaceContext"
import {
  terminalSizeRx,
  workspaceHandleRx,
  workspaceRx
} from "../rx/workspace"
import { FileEditor } from "./CodeEditor/FileEditor"
import { Terminal } from "./CodeEditor/Terminal"
import { FileExplorer } from "./CodeEditor/FileExplorer"
import { LoadingSpinner } from "./LoadingSpinner"
import { SolveButton } from "./CodeEditor/SolveButton"

export function CodeEditor({
  workspace,
  disableExplorer
}: {
  readonly workspace: Workspace
  readonly disableExplorer?: boolean
}) {
  const setWorkspace = useRxSet(workspaceRx)
  useEffect(() => {
    setWorkspace(Option.some(workspace))
  }, [workspace, setWorkspace])
  console.log(workspace)
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CodeEditorSuspended disableExplorer={disableExplorer} />
    </Suspense>
  )
}

function CodeEditorSuspended({
  disableExplorer
}: {
  readonly disableExplorer?: boolean
}) {
  const setSize = useRxSet(terminalSizeRx)
  const handle = useRxSuspenseSuccess(workspaceHandleRx)
  return (
    <WorkspaceContext.Provider value={handle.value}>
      <PanelGroup autoSaveId="editor" direction="vertical">
        <Panel>
          {disableExplorer === true ? (
            <FileExplorer />
          ) : (
            <PanelGroup autoSaveId="sidebar" direction="horizontal">
              <Panel
                defaultSize={20}
                className="bg-gray-50 dark:bg-neutral-900 min-w-[200px] flex flex-col"
              >
                <SolveButton />
                <FileExplorer />
              </Panel>
              <PanelResizeHandle />
              <Panel>
                <FileEditor />
              </Panel>
            </PanelGroup>
          )}
        </Panel>
        <PanelResizeHandle />
        <Panel onResize={setSize} defaultSize={30}>
          <Terminal />
        </Panel>
      </PanelGroup>
    </WorkspaceContext.Provider>
  )
}
