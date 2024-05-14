import { Workspace } from "@/domain/Workspace"
import { useRxSet, useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Fragment, ReactNode, Suspense, useCallback } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { LoadingSpinner } from "../components/LoadingSpinner"
import { FileEditor } from "./components/FileEditor"
import { FileExplorer } from "./components/FileExplorer"
import { Terminal } from "./components/Terminal"
import { WorkspaceContext } from "./context/WorkspaceContext"
import { workspaceHandleRx } from "./rx/workspace"

export function CodeEditor(props: {
  readonly workspace: Workspace
  readonly disableExplorer?: boolean
  readonly aboveExplorer?: ReactNode
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CodeEditorSuspended {...props} />
    </Suspense>
  )
}

function CodeEditorSuspended({
  workspace,
  disableExplorer,
  aboveExplorer
}: {
  readonly workspace: Workspace
  readonly disableExplorer?: boolean
  readonly aboveExplorer?: ReactNode
}) {
  const handle = useRxSuspenseSuccess(workspaceHandleRx(workspace)).value
  const setSize = useRxSet(handle.terminalSize)
  const onResize = useCallback(
    function (..._: any) {
      setSize()
    },
    [setSize]
  )
  return (
    <WorkspaceContext.Provider value={handle}>
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
        <Panel onResize={onResize} defaultSize={30}>
          <PanelGroup autoSaveId="terminal" direction="horizontal">
            {workspace.shells.map((shell, index) => (
              <Fragment key={index}>
                {index > 0 && <PanelResizeHandle />}
                <Panel onResize={onResize}>
                  <Terminal shell={shell} />
                </Panel>
              </Fragment>
            ))}
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </WorkspaceContext.Provider>
  )
}
