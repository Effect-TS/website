import type * as Cause from "effect/Cause"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import { useCallback, Fragment, Suspense } from "react"
import { useDefaultLayout } from "react-resizable-panels"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/ui/resizable"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs"
import { importAtom, WORKSPACE_AUTOSAVE_KEY } from "./atoms/import"
import { FileEditor } from "./components/file-editor"
import { FileExplorer } from "./components/file-explorer"
import { PlaygroundLoader } from "./components/loader"
import { Terminal } from "./components/terminal"
import { TraceViewer } from "./components/trace-viewer"
import {
  WorkspaceProvider,
  useWorkspaceHandle,
  useWorkspaceShells,
} from "./context/workspace"

export function CodeEditor() {
  const result = useAtomValue(importAtom)
  return AsyncResult.builder(result)
    .onSuccess((workspace) => (
      <>
        <PlaygroundLoader />
        <Suspense>
          <WorkspaceProvider workspace={workspace}>
            <CodeEditorPanels />
          </WorkspaceProvider>
        </Suspense>
      </>
    ))
    .onFailure((cause) => <ImportError cause={cause} />)
    .render()
}

/**
 * Safety net for an unexpected defect while resolving the initial workspace
 * (share hash, `?code` parameter, autosave, or default) — normal operation
 * always falls through to the default workspace instead of failing, so this
 * should only render on a genuine bug.
 */
function ImportError({ cause }: { cause: Cause.Cause<never> }) {
  console.error("Playground: failed to load workspace", cause)
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Something went wrong loading the playground.
      </p>
      <button
        type="button"
        className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        onClick={() => {
          localStorage.removeItem(WORKSPACE_AUTOSAVE_KEY)
          window.location.href = window.location.pathname
        }}
      >
        Reset playground
      </button>
    </div>
  )
}

function CodeEditorPanels() {
  const { terminalSize } = useWorkspaceHandle()
  const setSize = useAtomSet(terminalSize)
  const onResize = useCallback(
    function (..._: any) {
      setSize()
    },
    [setSize],
  )

  const editorLayout = useDefaultLayout({
    id: "editor",
    storage: globalThis.localStorage,
  })
  const sidebarLayout = useDefaultLayout({
    id: "sidebar",
    storage: globalThis.localStorage,
  })

  return (
    <ResizablePanelGroup
      {...editorLayout}
      orientation="vertical"
      className="h-full"
    >
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup
          {...sidebarLayout}
          orientation="horizontal"
          className="h-full"
        >
          <ResizablePanel defaultSize={20} minSize={10}>
            <FileExplorer />
          </ResizablePanel>
          <ResizableHandle className="w-px bg-zinc-200 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-500" />
          <ResizablePanel defaultSize={80}>
            <FileEditor />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle className="h-px bg-zinc-200 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-500" />

      <ResizablePanel
        defaultSize={30}
        minSize={10}
        onResize={onResize}
        className="h-full"
      >
        <div className="flex h-full flex-col border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <Tabs
            defaultValue="terminal"
            className="flex h-full w-full flex-col gap-0"
          >
            <TabsList className="!h-auto w-full justify-start gap-0 rounded-none border-b border-zinc-200 bg-transparent p-0 dark:border-zinc-800">
              <TabsTrigger
                value="terminal"
                className="-mb-px h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-4 py-2.5 font-mono text-xs tracking-wider text-zinc-500 uppercase transition-none hover:text-zinc-900 data-active:border-zinc-900 data-active:bg-transparent data-active:text-zinc-900 data-active:shadow-none dark:text-zinc-400 dark:hover:text-white dark:data-active:border-white dark:data-active:text-white"
              >
                Terminal
              </TabsTrigger>
              <TabsTrigger
                value="trace-viewer"
                className="-mb-px h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-4 py-2.5 font-mono text-xs tracking-wider text-zinc-500 uppercase transition-none hover:text-zinc-900 data-active:border-zinc-900 data-active:bg-transparent data-active:text-zinc-900 data-active:shadow-none dark:text-zinc-400 dark:hover:text-white dark:data-active:border-white dark:data-active:text-white"
              >
                Trace Viewer
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="terminal"
              className="m-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-zinc-100 dark:bg-zinc-900"
              keepMounted
            >
              <WorkspaceShells />
            </TabsContent>
            <TabsContent
              value="trace-viewer"
              className="m-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-zinc-100 data-[state=inactive]:hidden dark:bg-zinc-900"
              keepMounted
            >
              <TraceViewer />
            </TabsContent>
          </Tabs>
        </div>
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
    [setSize],
  )
  return (
    <ResizablePanelGroup orientation="vertical" className="h-full">
      {shells.map((shell, index) => {
        const id = `shell-${index}`
        const defaultSize = 100 / shells.length
        return (
          <Fragment key={id}>
            {index > 0 && <ResizableHandle id={id} />}
            <ResizablePanel
              id={id}
              defaultSize={defaultSize}
              onResize={onResize}
            >
              <Terminal shell={shell} />
            </ResizablePanel>
          </Fragment>
        )
      })}
    </ResizablePanelGroup>
  )
}
