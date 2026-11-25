import {
  RegistryProvider,
  useAtomMount,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react"
import * as Option from "effect/Option"
import * as Atom from "effect/reactivity/Atom"
import { X } from "lucide-react"
import * as React from "react"
import type { FlatWorkspaceMetadata } from "@/features/share/flat"
import type { EffectVersion } from "@/features/share/workspace"
import { SCRATCHPAD_ENTRY_PATH, SCRATCHPAD_ROOT_URI } from "./config.ts"
import {
  ScratchpadSessionContext,
  type ScratchpadSessionContextValue,
  useScratchpadSession,
} from "./context.tsx"
import { makeScratchpadEditorSession } from "./editor.ts"
import { EditorTabs } from "./EditorTabs.tsx"
import { FailureStrip } from "./FailureStrip.tsx"
import { makeContainerFailureAtoms } from "./failure.ts"
import { layerWebContainer } from "./container-webcontainer.ts"
import { FileExplorer } from "./FileExplorer.tsx"
import type { LoadNotice } from "./load.ts"
import { LoadNoticeBar } from "./LoadNoticeBar.tsx"
import { OutputPanel } from "./OutputPanel.tsx"
import { layerBrowserWorker } from "./lsp-worker-client.ts"
import { makeScratchpadResetAtoms } from "./reset.ts"
import { effectVersionOfFiles, SCRATCHPAD_SEED } from "./seed.ts"
import { makeScratchpadShareAtoms } from "./share-atoms.ts"

// `window.__scratchpadTest` for the real-Container e2e suite: dev server only,
// and lazily imported so production builds leave it out (see test-hook.tsx).
const ScratchpadTestHook = import.meta.env.DEV
  ? React.lazy(() => import("./test-hook.tsx"))
  : undefined

export interface ScratchpadProps {
  readonly initialCode?: string | undefined
  readonly initialFiles?: Readonly<Record<string, string>> | undefined
  readonly entryPath?: string | undefined
  /** Share-format metadata of the loaded Workspace, kept for Shares. */
  readonly metadata?: FlatWorkspaceMetadata | undefined
  readonly notice?: Option.Option<LoadNotice> | undefined
  /** The version the files target; read from `package.json` when omitted. */
  readonly effectVersion?: EffectVersion | undefined
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

/** Autosaves the Workspace while the Scratchpad is mounted. */
function Autosave() {
  const { autosaveAtom } = useScratchpadSession()
  useAtomMount(autosaveAtom)
  return null
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
  initialCode,
  initialFiles,
  entryPath,
  metadata,
  notice = Option.none(),
  effectVersion,
}: ScratchpadProps) {
  const [{ session, runtime }] = React.useState(() => {
    const transportLayer = layerBrowserWorker()
    const initialVersion =
      effectVersion ??
      effectVersionOfFiles(initialFiles ?? SCRATCHPAD_SEED.files)
    const effectVersionAtom = Atom.make(initialVersion).pipe(Atom.keepAlive)
    const editorSession = makeScratchpadEditorSession({
      effectVersionAtom,
      transportLayer,
      containerLayer: layerWebContainer,
      rootUri: SCRATCHPAD_ROOT_URI,
      ...(initialFiles !== undefined
        ? { initialFiles }
        : initialCode !== undefined
          ? { initialCode }
          : { initialFiles: SCRATCHPAD_SEED.files }),
      entryPath: entryPath ?? SCRATCHPAD_ENTRY_PATH,
      // The command `/play` typed into the shell (`../run src/main.ts`).
      shellCommand: metadata?.shells[0]?.command,
    })
    const workspaceMetadataAtom = Atom.make(
      metadata ??
        (initialFiles === undefined && initialCode === undefined
          ? SCRATCHPAD_SEED.metadata
          : undefined),
    ).pipe(Atom.keepAlive)
    const shareAtoms = makeScratchpadShareAtoms({
      runtime: editorSession.runtime,
      metadataAtom: workspaceMetadataAtom,
      initialFiles: initialFiles ?? SCRATCHPAD_SEED.files,
    })

    const resetAtoms = makeScratchpadResetAtoms({
      runtime: editorSession.runtime,
      metadataAtom: workspaceMetadataAtom,
      initialVersion,
      effectVersionAtom,
      replaceWorkspace: editorSession.replaceWorkspace,
    })

    const failureAtoms = makeContainerFailureAtoms({
      runtime: editorSession.runtime,
      containerPhaseAtom: editorSession.containerPhaseAtom,
    })

    const session: ScratchpadSessionContextValue = {
      elementAtom: editorSession.elementAtom,
      statusAtom: editorSession.statusAtom,
      containerPhaseAtom: editorSession.containerPhaseAtom,
      installLogAtom: editorSession.installLogAtom,
      terminalStateAtom: editorSession.terminalStateAtom,
      terminalOutputAtom: editorSession.terminalOutputAtom,
      openTerminalAtom: editorSession.openTerminalAtom,
      resizeTerminalAtom: editorSession.resizeTerminalAtom,
      terminalInputAtom: editorSession.terminalInputAtom,
      clearTerminalAtom: editorSession.clearTerminalAtom,
      restartRunAtom: editorSession.restartRunAtom,
      revealPositionAtom: editorSession.revealPositionAtom,
      traceAtoms: editorSession.traceAtoms,
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
      workspaceMetadataAtom,
      ...shareAtoms,
      ...resetAtoms,
      ...failureAtoms,
    }
    return { session, runtime: editorSession.runtime }
  })

  return (
    <RegistryProvider defaultIdleTTL={2000}>
      <ScratchpadSessionContext.Provider value={session}>
        <Autosave />
        {ScratchpadTestHook !== undefined && (
          <React.Suspense fallback={null}>
            <ScratchpadTestHook runtime={runtime} />
          </React.Suspense>
        )}
        <section
          aria-label="Effect TypeScript Scratchpad"
          className="flex h-full min-h-0 w-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <div className="flex min-h-0 flex-1">
            <FileExplorer />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <LoadNoticeBar notice={notice} />
              <EditorTabs />
              <WorkspaceErrorBanner />
              <CodeMirrorHost />
            </div>
          </div>
          {/* Full width under the explorer and editor, as on /play. */}
          <OutputPanel banner={<FailureStrip />} />
        </section>
      </ScratchpadSessionContext.Provider>
    </RegistryProvider>
  )
}
