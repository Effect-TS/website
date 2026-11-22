import {
  RegistryProvider,
  useAtomMount,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react"
import * as Option from "effect/Option"
import { X } from "lucide-react"
import * as React from "react"
import {
  DEFAULT_SCRATCHPAD_FILES,
  resolveLspTransportKind,
  resolveLspWsUrl,
  SCRATCHPAD_ENTRY_PATH,
  SCRATCHPAD_ROOT_URI,
} from "./config.ts"
import {
  ScratchpadSessionContext,
  type ScratchpadSessionContextValue,
  useScratchpadSession,
} from "./context.tsx"
import { makeScratchpadEditorSession } from "./editor.ts"
import { EditorTabs } from "./EditorTabs.tsx"
import { FileExplorer } from "./FileExplorer.tsx"
import { layerBrowserWorker } from "./lsp-worker-client.ts"
import { layerWebSocket } from "./transport.ts"

export interface ScratchpadProps {
  /** `worker` (default) or `websocket`; see `resolveLspTransportKind`. */
  readonly transport?: string | undefined
  readonly wsUrl?: string | undefined
  readonly initialCode?: string | undefined
  readonly initialFiles?: Readonly<Record<string, string>> | undefined
  readonly entryPath?: string | undefined
}

function WorkspaceErrorBanner() {
  const { workspaceErrorAtom, clearErrorAtom } = useScratchpadSession()
  const error = useAtomValue(workspaceErrorAtom)
  const clearError = useAtomSet(clearErrorAtom)

  if (Option.isNone(error)) {
    return null
  }

  return (
    <div
      role="alert"
      data-testid="scratchpad-workspace-error"
      className="flex shrink-0 items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      <span>{error.value}</span>
      <button
        type="button"
        aria-label="Dismiss error"
        onClick={() => clearError(undefined)}
        className="rounded p-0.5 hover:bg-red-200/60 dark:hover:bg-red-900/50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function CodeMirrorHost() {
  const { editorAtom, elementAtom, activeFileAtom } = useScratchpadSession()
  useAtomMount(editorAtom)
  const setElement = useAtomSet(elementAtom)
  const activeFile = useAtomValue(activeFileAtom)

  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      setElement(Option.fromNullishOr(node))
    },
    [setElement],
  )

  const hasActiveFile = Option.isSome(activeFile)

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div
        ref={ref}
        data-testid="scratchpad-editor"
        className={
          hasActiveFile
            ? "h-full min-h-0 w-full flex-1 overflow-hidden"
            : "hidden"
        }
      />
      {!hasActiveFile && (
        <div
          data-testid="scratchpad-empty-state"
          className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
        >
          <p className="font-medium text-zinc-700 dark:text-zinc-300">
            No file open
          </p>
          <p className="text-xs">
            Select a file from the explorer or create a new .ts file.
          </p>
        </div>
      )}
    </div>
  )
}

export function Scratchpad({
  transport,
  wsUrl,
  initialCode,
  initialFiles,
  entryPath,
}: ScratchpadProps) {
  const [session] = React.useState<ScratchpadSessionContextValue>(() => {
    const transportKind = resolveLspTransportKind(
      transport ?? import.meta.env.PUBLIC_LSP_TRANSPORT,
    )
    const transportLayer =
      transportKind === "websocket"
        ? layerWebSocket(
            resolveLspWsUrl(wsUrl ?? import.meta.env.PUBLIC_LSP_WS_URL),
          )
        : layerBrowserWorker({
            onReady: (timings, memoryBytes) => {
              // Read by the e2e tests and handy when demoing.
              ;(
                window as { __scratchpadLspReady?: unknown }
              ).__scratchpadLspReady = {
                ...timings,
                memoryBytes,
                at: performance.now(),
              }
            },
          })
    const editorSession = makeScratchpadEditorSession({
      transportLayer,
      rootUri: SCRATCHPAD_ROOT_URI,
      ...(initialFiles !== undefined
        ? { initialFiles }
        : initialCode !== undefined
          ? { initialCode }
          : { initialFiles: DEFAULT_SCRATCHPAD_FILES }),
      entryPath: entryPath ?? SCRATCHPAD_ENTRY_PATH,
    })

    return {
      elementAtom: editorSession.elementAtom,
      statusAtom: editorSession.statusAtom,
      editorAtom: editorSession.editorAtom,
      treeAtom: editorSession.treeAtom,
      openTabsAtom: editorSession.openTabsAtom,
      activeFileAtom: editorSession.activeFileAtom,
      diagnosticsAtom: editorSession.diagnosticsAtom,
      workspaceErrorAtom: editorSession.workspaceErrorAtom,
      reconnectAtom: editorSession.reconnectAtom,
      openFileAtom: editorSession.openFileAtom,
      closeTabAtom: editorSession.closeTabAtom,
      createFileAtom: editorSession.createFileAtom,
      createDirectoryAtom: editorSession.createDirectoryAtom,
      renamePathAtom: editorSession.renamePathAtom,
      deletePathAtom: editorSession.deletePathAtom,
      clearErrorAtom: editorSession.clearErrorAtom,
    }
  })

  return (
    <RegistryProvider defaultIdleTTL={2000}>
      <ScratchpadSessionContext.Provider value={session}>
        <section
          aria-label="Effect TypeScript Scratchpad"
          className="flex h-full min-h-0 w-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <FileExplorer />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <EditorTabs />
            <WorkspaceErrorBanner />
            <CodeMirrorHost />
          </div>
        </section>
      </ScratchpadSessionContext.Provider>
    </RegistryProvider>
  )
}
