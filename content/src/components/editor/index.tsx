import { useCallback, Fragment, Suspense } from "react"
import { ChartGanttIcon, SquareTerminalIcon } from "lucide-react"
import { Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import * as Hash from "effect/Hash"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FileEditor } from "./components/file-editor"
import { FileExplorer } from "./components/file-explorer"
import { PlaygroundLoader } from "./components/loader"
import { Terminal } from "./components/terminal"
import { TraceViewer } from "./components/trace-viewer"
import { WorkspaceProvider } from "./context/workspace"
import { useWorkspaceHandle, useWorkspaceShells } from "./context/workspace"
import { importAtom } from "./atoms/import"

export function CodeEditor() {
  return Result.builder(useAtomValue(importAtom))
    .onSuccess((workspace) => (
      <TooltipProvider>
        <PlaygroundLoader />
        <Suspense>
          <WorkspaceProvider workspace={workspace}>
            <CodeEditorPanels />
          </WorkspaceProvider>
        </Suspense>
        <Toaster />
      </TooltipProvider>
    ))
    .render()
}

function CodeEditorPanels() {
  const { terminalSize } = useWorkspaceHandle()
  const setSize = useAtomSet(terminalSize)
  const onResize = useCallback(
    function (..._: any) {
      setSize()
    },
    [setSize]
  )
  return (
    <ResizablePanelGroup autoSaveId="editor" direction="vertical">
      <ResizablePanel>
        <ResizablePanelGroup autoSaveId="sidebar" direction="horizontal">
          <ResizablePanel defaultSize={20}>
            <FileExplorer />
          </ResizablePanel>
          <ResizableHandle direction="vertical" />
          <ResizablePanel>
            <div className="h-full flex flex-col">
              <div className="flex-1">
                <FileEditor />
              </div>
              <div className="h-6 px-2 bg-[--sl-color-bg-nav] border-t border-[--sl-color-hairline] font-mono text-xs text-[--sl-color-text] flex items-center">
                <span id="vim-status"></span>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle direction="horizontal" />

      <ResizablePanel defaultSize={30} onResize={onResize}>
        <ResizablePanelGroup direction="horizontal">
          <Tabs defaultValue="terminal" className="h-full w-full flex flex-col">
            <TabsList className="inline-flex items-center justify-start gap-2 p-0 bg-[--sl-color-bg] font-semibold border-b border-b-neutral-200 dark:border-b-neutral-700 rounded-none">
              <TabsTrigger
                value="terminal"
                className="h-full grid grid-cols-[16px_1fr] gap-1 py-0 px-2 bg-transparent text-[--sl-color-text] data-[state=active]:text-[--sl-color-white] data-[state=active]:bg-transparent data-[state=active]:shadow-[inset_0_-1px_0_var(--sl-color-white)] data-[state=active]:border-b-white rounded-none cursor-pointer transition-none"
              >
                <SquareTerminalIcon size={16} />
                <span>Terminal</span>
              </TabsTrigger>
              <TabsTrigger
                value="trace-viewer"
                className="h-full grid grid-cols-[16px_1fr] gap-1 py-0 px-2 bg-transparent text-[--sl-color-text] data-[state=active]:text-[--sl-color-white] data-[state=active]:bg-transparent data-[state=active]:shadow-[inset_0_-1px_0_var(--sl-color-white)] rounded-none cursor-pointer transition-none"
              >
                <ChartGanttIcon size={16} />
                <span>Trace Viewer</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="terminal"
              className="h-full w-full m-0 overflow-y-auto data-[state=inactive]:hidden"
              forceMount
            >
              <WorkspaceShells />
            </TabsContent>
            <TabsContent
              value="trace-viewer"
              className="h-full w-full m-0 overflow-y-auto data-[state=inactive]:hidden"
              forceMount
            >
              <TraceViewer />
            </TabsContent>
          </Tabs>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function WorkspaceShells() {
  const { terminalSize } = useWorkspaceHandle()
  const shells = useWorkspaceShells()
  const setSize = useAtomSet(terminalSize)
  const onResize = useCallback(
    function (..._: any) {
      setSize()
    },
    [setSize]
  )
  return (
    <Fragment>
      {shells.map((shell, index) => {
        const hash = Hash.hash(shell).toString()
        return (
          <Fragment key={hash}>
            {index > 0 && <ResizableHandle id={hash} direction="vertical" />}
            <ResizablePanel id={hash} onResize={onResize} order={index} className="h-full">
              <Terminal shell={shell} />
            </ResizablePanel>
          </Fragment>
        )
      })}
    </Fragment>
  )
}
