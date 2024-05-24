import React, { Fragment, Suspense, useCallback } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable"
import { useRxSet } from "@effect-rx/rx-react"
import { FileEditor } from "./components/common/file-editor"
import { FileExplorer } from "./components/common/file-explorer"
import { Terminal } from "./components/common/terminal"
import { Workspace } from "@/workspaces/domain/workspace"
import { useWorkspaceHandle } from "@/workspaces/context"
import { WorkspaceProvider } from "@/workspaces/WorkspaceProvider"

export declare namespace CodeEditor {
  export interface Props {
    readonly disableExplorer?: boolean
    readonly workspace: Workspace
  }
}

export function CodeEditor({
  disableExplorer,
  workspace
}: {
  readonly disableExplorer?: boolean
  readonly workspace: Workspace
}) {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
      <WorkspaceProvider workspace={workspace}>
        <CodeEditorSuspended disableExplorer={disableExplorer} />
      </WorkspaceProvider>
    </Suspense>
  )
}

function CodeEditorSuspended({
  disableExplorer
}: {
  readonly disableExplorer?: boolean
}) {
  const handle = useWorkspaceHandle()
  const setSize = useRxSet(handle.terminalSize)
  const onResize = useCallback(
    function (..._: any) {
      setSize()
    },
    [setSize]
  )

  return (
    <ResizablePanelGroup autoSaveId={`editor`} direction="vertical">
      <ResizablePanel>
        {disableExplorer === true ? (
          <FileExplorer />
        ) : (
          <ResizablePanelGroup autoSaveId={`sidebar`} direction="horizontal">
            <ResizablePanel
              defaultSize={20}
              className="bg-gray-50 dark:bg-neutral-900 min-w-[200px] flex flex-col"
            >
              <FileExplorer />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel>
              <FileEditor />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel onResize={onResize} defaultSize={30}>
        <ResizablePanelGroup autoSaveId={`terminal`} direction="horizontal">
          {handle.workspace.shells.map((shell, index) => (
            <Fragment key={index}>
              {index > 0 && <ResizableHandle />}
              <ResizablePanel onResize={onResize}>
                <Terminal shell={shell} />
              </ResizablePanel>
            </Fragment>
          ))}
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
