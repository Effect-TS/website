import React, { Fragment, Suspense, useCallback } from "react"
import { Hash } from "effect"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { useRxSet } from "@effect-rx/rx-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Workspace } from "@/workspaces/domain/workspace"
import { useWorkspaceHandle, useWorkspaceShells } from "@/workspaces/context"
import { WorkspaceProvider } from "@/workspaces/WorkspaceProvider"
import { FileEditor } from "./components/common/file-editor"
import { FileExplorer } from "./components/common/file-explorer"
import { Terminal } from "./components/common/terminal"
import { PanelResizeHandleVertical } from "../ui/resizable"
import { TooltipProvider } from "../ui/tooltip"

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
    <TooltipProvider>
      <PanelGroup autoSaveId={`editor`} direction="vertical">
        <Panel>
          {disableExplorer === true ? (
            <FileEditor />
          ) : (
            <PanelGroup autoSaveId={`sidebar`} direction="horizontal">
              <Panel
                defaultSize={20}
                className="bg-gray-50 dark:bg-neutral-900 min-w-[200px] flex flex-col"
              >
                <FileExplorer />
              </Panel>
              <PanelResizeHandleVertical />
              <Panel>
                <FileEditor />
              </Panel>
            </PanelGroup>
          )}
        </Panel>
        <PanelResizeHandle />
        <Panel onResize={onResize} defaultSize={30}>
          <PanelGroup direction="horizontal">
            <WorkspaceShells />
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </TooltipProvider>
  )
}

function WorkspaceShells() {
  const handle = useWorkspaceHandle()
  const shells = useWorkspaceShells()
  const setSize = useRxSet(handle.terminalSize)
  const onResize = useCallback(
    function (..._: any) {
      setSize()
    },
    [setSize]
  )
  return (
    <>
      {shells.map((shell, index) => (
        <Fragment key={Hash.hash(shell)}>
          {index > 0 && (
            <PanelResizeHandleVertical id={`${Hash.hash(shell)}`} />
          )}
          <Panel id={`${Hash.hash(shell)}`} onResize={onResize} order={index}>
            <Terminal shell={shell} />
          </Panel>
        </Fragment>
      ))}
    </>
  )
}
