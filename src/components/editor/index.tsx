import React, { Fragment, Suspense, useCallback } from "react"
import { WorkspaceContext } from "@/components/editor/context/workspace"
import { Workspace } from "@/components/editor/domain/workspace"
import { workspaceHandleRx } from "@/components/editor/rx/workspace"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useRxSet, useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { FileEditor } from "./components/common/file-editor"
import { FileExplorer } from "./components/common/file-explorer"
import { Terminal } from "./components/common/terminal"
import { Toolbar as PlaygroundToolbar } from "./components/playground/toolbar"
import { Toolbar as TutorialToolbar } from "./components/tutorial/toolbar"

export declare namespace CodeEditor {
  export interface Props {
    readonly disableExplorer?: boolean
    readonly layout: Layout
    readonly workspace: Workspace
  }

  export type Layout = "playground" | "tutorial"
}

export const CodeEditor: React.FC<CodeEditor.Props> = (props) => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
      <CodeEditorSuspended {...props} />
    </Suspense>
  )
}

CodeEditor.displayName = "CodeEditor"

const CodeEditorSuspended: React.FC<CodeEditor.Props> = ({
  workspace,
  layout,
  disableExplorer,
}) => {
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
      {getToolbar(layout)}

      <ResizablePanelGroup autoSaveId={`${layout}-editor`} direction="vertical">
        <ResizablePanel>
          {disableExplorer === true ? (
            <FileExplorer />
          ) : (
            <ResizablePanelGroup autoSaveId={`${layout}-sidebar`} direction="horizontal">
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
          <ResizablePanelGroup autoSaveId={`${layout}-terminal`} direction="horizontal">
            {workspace.shells.map((shell, index) => (
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
    </WorkspaceContext.Provider>
  )
}

CodeEditorSuspended.displayName = "CodeEditorSuspended"

const getToolbar = (layout: CodeEditor.Layout) => {
  switch (layout) {
    case "playground": {
      return <PlaygroundToolbar />
    }
    case "tutorial": {
      return <TutorialToolbar />
    }
  }
}