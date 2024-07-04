import React, { Fragment, Suspense, useCallback } from "react"
import { Hash } from "effect"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { useRxSet } from "@effect-rx/rx-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Workspace } from "@/workspaces/domain/workspace"
import { useWorkspaceHandle, useWorkspaceShells } from "@/workspaces/context/workspace"
import { WorkspaceProvider } from "@/workspaces/WorkspaceProvider"
import { Icon } from "../icons"
import { PanelResizeHandleVertical } from "../ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { TooltipProvider } from "../ui/tooltip"
import { FileEditor } from "./components/common/file-editor"
import { FileExplorer } from "./components/common/file-explorer"
import { Terminal } from "./components/common/terminal"
import { TraceViewer } from "./components/common/trace-viewer"

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
      <PanelGroup autoSaveId="editor" direction="vertical">
        <Panel>
          {disableExplorer === true ? (
            <FileEditor />
          ) : (
            <PanelGroup autoSaveId="sidebar" direction="horizontal">
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
          <PanelGroup
            direction="horizontal"
            className="border-y border-neutral-300 dark:border-neutral-700"
          >
            <Tabs defaultValue="terminal" className="flex flex-col">
              <TabsList>
                <TabsTrigger value="terminal">
                  <Icon name="display" className="h-3 w-3 mr-2" />
                  <span className="font-mono font-bold text-xs">
                    Terminal
                  </span>
                </TabsTrigger>
                <TabsTrigger value="trace-viewer">
                  <Icon name="mixer-horizontal" className="h-3 w-3 mr-2" />
                  <span className="font-mono font-bold text-xs">
                    Trace Viewer
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="terminal"
                forceMount
                className="h-full w-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <WorkspaceShells />
              </TabsContent>
              <TabsContent
                value="trace-viewer"
                forceMount
                className="h-full w-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <TraceViewer />
              </TabsContent>
            </Tabs>
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
          <Panel id={`${Hash.hash(shell)}`} onResize={onResize} order={index} className="h-full">
            <Terminal shell={shell} />
          </Panel>
        </Fragment>
      ))}
    </>
  )
}
