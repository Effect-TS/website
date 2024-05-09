import { Workspace } from "@/domain/Workspace"
import { useRxSet, useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Option } from "effect"
import { ReactNode, Suspense, useEffect } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { WorkspaceContext } from "./context/WorkspaceContext"
import {
  terminalSizeRx,
  workspaceHandleRx,
  workspaceRx
} from "./rx/workspace"
import { FileEditor } from "./components/FileEditor"
import { Terminal } from "./components/Terminal"
import { FileExplorer } from "./components/FileExplorer"
import { SolveButton } from "../app/tutorials/[...slug]/components/SolveButton"
import { LoadingSpinner } from "../components/LoadingSpinner"

export function CodeEditor({
  workspace,
  ...props
}: {
  readonly workspace: Workspace
  readonly disableExplorer?: boolean
  readonly aboveExplorer?: ReactNode
}) {
  const setWorkspace = useRxSet(workspaceRx)
  useEffect(() => {
    setWorkspace(Option.some(workspace))
  }, [workspace, setWorkspace])
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CodeEditorSuspended {...props} />
    </Suspense>
  )
}

function CodeEditorSuspended({
  disableExplorer,
  aboveExplorer
}: {
  readonly disableExplorer?: boolean
  readonly aboveExplorer?: ReactNode
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
                {aboveExplorer}
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
