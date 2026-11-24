import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import {
  jumpToDefinition,
  languageServerExtensions,
  type LSPClient,
  type LSPClientExtension,
} from "@codemirror/lsp-client"
import {
  Annotation,
  EditorState,
  type Extension,
  type TransactionSpec,
} from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Stream from "effect/Stream"
import { makeTraceAtoms, type TraceAtoms } from "@/features/devtools/traces"
import { SCRATCHPAD_ENTRY_PATH, SCRATCHPAD_ROOT_URI } from "./config.ts"
import {
  Container,
  type ContainerPhase,
  mirrorWorkspace,
  type TerminalSize,
} from "./container.ts"
import {
  containerPhaseOf,
  Dependencies,
  emptyInstallLog,
  type InstallLog,
  layerDependencies,
} from "./dependencies.ts"
import { diagnosticsWithCodeActions } from "./code-actions.ts"
import { scratchpadEditorTheme } from "./editor-theme.ts"
import { formatOnSave, makeDprintDocumentFormatter } from "./format.ts"
import {
  isLibraryDocumentPath,
  isLibraryPath,
  libraryUriToPath,
} from "./library-files.ts"
import {
  type DiagnosticsCheck,
  diagnosticErrorsOf,
  runDiagnosticsWriter,
} from "./diagnostics-file.ts"
import {
  emptyTerminalOutput,
  initialTerminalState,
  layerTerminal,
  Terminal,
  type TerminalOutput,
  type TerminalService,
  type TerminalState,
} from "./terminal.ts"
import { SCRATCHPAD_SEED_FILES } from "./seed.ts"
import { layerTraces } from "./traces.ts"
import { isLspDocumentPath, MultiFileLspWorkspace } from "./lsp-workspace.ts"
import {
  makeScratchpadSession,
  type LspStatus,
  type ScratchpadSessionConfig,
} from "./session.ts"
import type { LspTransport } from "./transport.ts"
import {
  LspWorkspaceMirror,
  type LspWorkspaceMirrorService,
  workspaceEventToFsOp,
} from "./worker-transport.ts"
import {
  isReadOnlyPath,
  layerMemoryWorkspace,
  pathToWorkspaceUri,
  Workspace,
  type WorkspaceError,
  type WorkspaceNode,
  type WorkspaceService,
  workspaceUriToPath,
} from "./workspace.ts"

export interface FileDiagnosticSummary {
  readonly errors: number
  readonly warnings: number
}

export type EditorViewFactory = (args: {
  readonly parent: HTMLElement
  readonly state: EditorState
}) => EditorView

export interface ScratchpadEditorSessionConfig extends Omit<
  ScratchpadSessionConfig,
  "lspClientConfig"
> {
  readonly initialCode?: string | undefined
  readonly initialFiles?: Readonly<Record<string, string>> | undefined
  readonly entryPath?: string | undefined
  readonly workspaceLayer?: Layer.Layer<Workspace, WorkspaceError> | undefined
  /**
   * The Container the Workspace is mirrored into. It boots when the editor
   * mounts and never blocks editing. Without one, nothing runs.
   */
  readonly containerLayer?: Layer.Layer<Container> | undefined
  /**
   * With a Container, how long after it is ready diagnostics wait for the
   * installed types before they are shown anyway. Default 60 seconds.
   */
  readonly typesTimeout?: Duration.Input | undefined
  /**
   * With a Container, the command typed into its shell once it can run code
   * (the Workspace's `shells[0].command`). Default `../run src/main.ts`.
   */
  readonly shellCommand?: string | undefined
  readonly createEditorView?: EditorViewFactory | undefined
}

export interface ScratchpadEditorInstance {
  readonly view: EditorView
  readonly client: LSPClient
  readonly workspace: WorkspaceService
}

export interface CreateFileInput {
  readonly path: string
  readonly content?: string | undefined
}

/** A position to show in the editor. `line` and `column` are 1-based. */
export interface RevealPositionInput {
  readonly path: string
  readonly line: number
  readonly column: number
}

export interface RenamePathInput {
  readonly oldPath: string
  readonly newPath: string
}

/** Every file of the next Workspace, and the one to open. */
export interface ReplaceWorkspaceInput {
  readonly files: Readonly<Record<string, string>>
  readonly entryPath: string
}

export interface ScratchpadEditorSession {
  readonly runtime: Atom.AtomRuntime<LspTransport | Workspace>
  readonly elementAtom: Atom.Writable<Option.Option<HTMLElement>>
  readonly statusAtom: Atom.Writable<LspStatus>
  /**
   * The Container's phase, including the install and the types copy, or
   * `None` when the session has no Container.
   */
  readonly containerPhaseAtom: Atom.Atom<Option.Option<ContainerPhase>>
  /** The latest `pnpm install`'s output and exit code. */
  readonly installLogAtom: Atom.Atom<InstallLog>
  /**
   * False while diagnostics wait for the installed types (only with a
   * Container). Once true it stays true.
   */
  readonly diagnosticsVisibleAtom: Atom.Atom<boolean>
  /** The shell, whether the watch runner is in the foreground, and the latest Run. */
  readonly terminalStateAtom: Atom.Atom<TerminalState>
  /** The terminal's text (the shell, the runner and installs). */
  readonly terminalOutputAtom: Atom.Atom<TerminalOutput>
  /** Starts the terminal's shell at this size (the panel mounting), or resizes it. */
  readonly openTerminalAtom: Atom.AtomResultFn<TerminalSize, void>
  readonly resizeTerminalAtom: Atom.AtomResultFn<TerminalSize, void>
  /** The visitor's keystrokes in the terminal. */
  readonly terminalInputAtom: Atom.AtomResultFn<string, void>
  readonly clearTerminalAtom: Atom.AtomResultFn<void, void>
  /** Tells the watch runner to run again (Restart). */
  readonly restartRunAtom: Atom.AtomResultFn<void, void>
  /** Opens a file and puts the cursor at a position (clickable errors). */
  readonly revealPositionAtom: Atom.AtomResultFn<RevealPositionInput, void>
  /** The spans the latest Run reported (the Traces tab). */
  readonly traceAtoms: TraceAtoms
  readonly editorAtom: Atom.Atom<
    AsyncResult.AsyncResult<ScratchpadEditorInstance>
  >
  readonly treeAtom: Atom.Writable<ReadonlyArray<WorkspaceNode>>
  readonly openTabsAtom: Atom.Writable<ReadonlyArray<string>>
  readonly activeFileAtom: Atom.Writable<Option.Option<string>>
  readonly diagnosticsAtom: Atom.Writable<
    ReadonlyMap<string, FileDiagnosticSummary>
  >
  readonly workspaceErrorAtom: Atom.Writable<Option.Option<string>>
  readonly reconnectAtom: Atom.AtomResultFn<void, void>
  readonly openFileAtom: Atom.AtomResultFn<string, void>
  readonly closeTabAtom: Atom.AtomResultFn<string, void>
  readonly createFileAtom: Atom.AtomResultFn<CreateFileInput, void>
  readonly createDirectoryAtom: Atom.AtomResultFn<string, void>
  readonly renamePathAtom: Atom.AtomResultFn<RenamePathInput, void>
  readonly deletePathAtom: Atom.AtomResultFn<string, void>
  readonly clearErrorAtom: Atom.AtomResultFn<void, void>
  /**
   * Swaps every Workspace file for `files` in place (Reset, version switch)
   * and opens `entryPath` in a single tab. The Container and the language
   * server follow through the Workspace's events. Fails, leaving the
   * Workspace as it was, when `files` breaks the Workspace limits.
   */
  readonly replaceWorkspace: (
    input: ReplaceWorkspaceInput,
  ) => Effect.Effect<
    void,
    WorkspaceError,
    Workspace | AtomRegistry.AtomRegistry
  >
}

/**
 * Diagnostic client capabilities `@codemirror/lsp-client` does not declare by
 * itself. tsrs attaches `relatedInformation` (Effect's "Inside this Effect
 * generator." notes, for example) to pulled diagnostics only when the client
 * declares `textDocument.diagnostic.relatedInformation`. Both language server
 * paths pull diagnostics on the client's behalf with these capabilities in
 * effect.
 */
export const DIAGNOSTIC_CLIENT_CAPABILITIES = {
  textDocument: {
    diagnostic: {
      dynamicRegistration: false,
      relatedDocumentSupport: false,
      relatedInformation: true,
      tagSupport: { valueSet: [1, 2] },
      codeDescriptionSupport: true,
      dataSupport: true,
    },
    publishDiagnostics: {
      relatedInformation: true,
      tagSupport: { valueSet: [1, 2] },
      codeDescriptionSupport: true,
      dataSupport: true,
    },
  },
} as const

export const diagnosticCapabilities: LSPClientExtension = {
  clientCapabilities: DIAGNOSTIC_CLIENT_CAPABILITIES,
}

const defaultEditorViewFactory: EditorViewFactory = ({ parent, state }) =>
  new EditorView({ parent, state })

/** Marks a transaction that applies a write the Workspace already has. */
const externalWrite = Annotation.define<boolean>()

/**
 * The single span that turns `from` into `to`: their common prefix and
 * suffix stay, so a cursor outside the changed span keeps its place.
 */
export const changedSpan = (
  from: string,
  to: string,
): { readonly from: number; readonly to: number; readonly insert: string } => {
  const max = Math.min(from.length, to.length)
  let start = 0
  while (start < max && from.charCodeAt(start) === to.charCodeAt(start)) {
    start++
  }
  let endFrom = from.length
  let endTo = to.length
  while (
    endFrom > start &&
    endTo > start &&
    from.charCodeAt(endFrom - 1) === to.charCodeAt(endTo - 1)
  ) {
    endFrom--
    endTo--
  }
  return { from: start, to: endFrom, insert: to.slice(start, endTo) }
}

const languageIdForPath = (relPath: string): string =>
  relPath.endsWith(".tsx") ? "typescriptreact" : "typescript"

/** CodeMirror language support by extension; other files are plain text. */
const languageSupportForPath = (relPath: string): Extension => {
  if (relPath.endsWith(".ts") || relPath.endsWith(".tsx")) {
    return javascript({ typescript: true, jsx: relPath.endsWith(".tsx") })
  }
  if (relPath.endsWith(".json")) {
    return json()
  }
  return []
}

const summarizeDiagnostics = (
  items: ReadonlyArray<{ readonly severity?: number | undefined }>,
): FileDiagnosticSummary => {
  let errors = 0
  let warnings = 0
  for (const item of items) {
    if (item.severity === 1) errors += 1
    else if (item.severity === 2) warnings += 1
  }
  return { errors, warnings }
}

const resolveInitialFiles = (
  config: ScratchpadEditorSessionConfig,
): {
  readonly files: Readonly<Record<string, string>>
  readonly entryPath: string
} => {
  if (config.initialFiles !== undefined) {
    const keys = Object.keys(config.initialFiles)
    const entry =
      config.entryPath ??
      (keys.includes(SCRATCHPAD_ENTRY_PATH)
        ? SCRATCHPAD_ENTRY_PATH
        : (keys[0] ?? SCRATCHPAD_ENTRY_PATH))
    return { files: config.initialFiles, entryPath: entry }
  }

  if (config.initialCode !== undefined) {
    const entry = config.entryPath ?? SCRATCHPAD_ENTRY_PATH
    return {
      files: { [entry]: config.initialCode },
      entryPath: entry,
    }
  }

  return {
    files: SCRATCHPAD_SEED_FILES,
    entryPath: config.entryPath ?? SCRATCHPAD_ENTRY_PATH,
  }
}

/** How long no diagnostics may arrive before the diagnostics file trusts them. */
export const DIAGNOSTICS_QUIET_MS = 400

export const makeScratchpadEditorSession = (
  config: ScratchpadEditorSessionConfig,
): ScratchpadEditorSession => {
  const rootUri = config.rootUri ?? SCRATCHPAD_ROOT_URI
  const { files: initialFiles, entryPath } = resolveInitialFiles(config)
  const createEditorView = config.createEditorView ?? defaultEditorViewFactory

  const wsLayer =
    config.workspaceLayer ??
    layerMemoryWorkspace({
      rootUri,
      initialFiles,
    })

  // Mutable session handles shared between the LSP workspace bridge and atoms
  let activeView: EditorView | undefined
  let activeClient: LSPClient | undefined
  let activeWorkspace: WorkspaceService | undefined
  let activeRegistry: AtomRegistry.AtomRegistry | undefined
  let activeLspWorkspace: MultiFileLspWorkspace | undefined
  let activeMirror: LspWorkspaceMirrorService | undefined
  let mountedFilePath: string | undefined
  let isSwappingState = false

  const editorStates = new Map<string, EditorState>()
  // Told about every diagnostics push (the diagnostics file's wake-ups).
  const diagnosticsListeners = new Set<() => void>()
  const diagnosticsPushes = Stream.callback<void>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const wake = () => Queue.offerUnsafe(queue, undefined)
        diagnosticsListeners.add(wake)
        return wake
      }),
      (wake) => Effect.sync(() => diagnosticsListeners.delete(wake)),
    ),
  )
  const lastDiagnosticsByUri = new Map<string, string>()
  // The document version each push was for, and when the last push came
  // (Date.now), for the diagnostics file.
  const pushedVersionByUri = new Map<string, number>()
  const pushedAtByUri = new Map<string, number>()
  let lastPushAt = 0
  // When the latest installed types mounted (Date.now). A remount (a Reset
  // or version switch reinstalls) re-pulls every document at the same
  // version, so the diagnostics file also waits for a push after it.
  let typesMountedAt = 0
  let mountedTypesInfo: unknown
  // With a Container, diagnostics wait for the installed types (ADR 0004).
  let diagnosticsHidden = config.containerLayer !== undefined

  const treeAtom = Atom.make<ReadonlyArray<WorkspaceNode>>([]).pipe(
    Atom.keepAlive,
  )
  const openTabsAtom = Atom.make<ReadonlyArray<string>>(
    Object.keys(initialFiles).includes(entryPath) ? [entryPath] : [],
  ).pipe(Atom.keepAlive)
  const activeFileAtom = Atom.make<Option.Option<string>>(
    Object.keys(initialFiles).includes(entryPath)
      ? Option.some(entryPath)
      : Option.none(),
  ).pipe(Atom.keepAlive)
  const diagnosticsAtom = Atom.make<ReadonlyMap<string, FileDiagnosticSummary>>(
    new Map(),
  ).pipe(Atom.keepAlive)
  const workspaceErrorAtom = Atom.make<Option.Option<string>>(
    Option.none(),
  ).pipe(Atom.keepAlive)

  /** Caches a push, and summarizes it unless diagnostics are hidden. */
  const recordPublishedDiagnostics = (params: unknown) => {
    if (
      typeof params !== "object" ||
      params === null ||
      !("uri" in params) ||
      typeof params.uri !== "string"
    ) {
      return
    }
    lastPushAt = Date.now()
    pushedAtByUri.set(params.uri, lastPushAt)
    for (const wake of diagnosticsListeners) wake()
    if ("version" in params && typeof params.version === "number") {
      pushedVersionByUri.set(params.uri, params.version)
    }
    lastDiagnosticsByUri.set(
      params.uri,
      JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params,
      }),
    )
    if (!diagnosticsHidden) summarizePublishedDiagnostics(params)
  }

  const summarizePublishedDiagnostics = (params: object) => {
    if (!("uri" in params) || typeof params.uri !== "string") return
    const uri = params.uri
    const diagnostics =
      "diagnostics" in params && Array.isArray(params.diagnostics)
        ? (params.diagnostics as ReadonlyArray<{ readonly severity?: number }>)
        : []

    const relPath = workspaceUriToPath(uri, rootUri)
    if (relPath === undefined || activeRegistry === undefined) {
      return
    }

    const summary = summarizeDiagnostics(diagnostics)
    const prev = activeRegistry.get(diagnosticsAtom)
    const next = new Map(prev)
    if (summary.errors === 0 && summary.warnings === 0) {
      next.delete(relPath)
    } else {
      next.set(relPath, summary)
    }
    activeRegistry.set(diagnosticsAtom, next)
  }

  let switchViewToFile:
    | ((relPath: string) => Effect.Effect<EditorView | null>)
    | undefined

  const session = makeScratchpadSession({
    ...config,
    rootUri,
    lspClientConfig: {
      // Before `languageServerExtensions()`: it renders the diagnostics
      // pushes with their quick fixes, and adds Ctrl/Cmd+. code actions.
      extensions: [
        diagnosticsWithCodeActions(),
        ...languageServerExtensions(),
        diagnosticCapabilities,
      ],
      workspace: (client) => {
        const ws = new MultiFileLspWorkspace(client, {
          rootUri,
          onDisplayFile: async (relPath) => {
            if (switchViewToFile === undefined) return null
            return Effect.runPromise(switchViewToFile(relPath))
          },
          // Server edits (rename, code actions) to a file that is not
          // mounted: its cached editor state, or else its Workspace content.
          onServerUpdateFile: (relPath, update: TransactionSpec) => {
            const write = (nextText: string) => {
              activeLspWorkspace?.upsertWorkspaceFile(relPath, nextText)
              if (activeWorkspace !== undefined) {
                void Effect.runPromise(
                  activeWorkspace
                    .writeFile(relPath, nextText)
                    .pipe(Effect.ignore),
                )
              }
            }
            const existingState = editorStates.get(relPath)
            if (existingState !== undefined) {
              const nextState = existingState.update(update).state
              editorStates.set(relPath, nextState)
              write(nextState.doc.toString())
              return
            }
            const ws = activeWorkspace
            if (ws === undefined || isReadOnlyPath(relPath)) return
            void Effect.runPromise(
              ws.readFile(relPath).pipe(
                Effect.tap((content) =>
                  Effect.sync(() => {
                    // Opened in the meantime: apply to that state instead.
                    const opened = editorStates.get(relPath)
                    const base = opened ?? EditorState.create({ doc: content })
                    const nextState = base.update(update).state
                    if (opened !== undefined) {
                      editorStates.set(relPath, nextState)
                    }
                    write(nextState.doc.toString())
                  }),
                ),
                Effect.ignore,
              ),
            )
          },
        })
        activeLspWorkspace = ws
        return ws
      },
      notificationHandlers: {
        "textDocument/publishDiagnostics": (_client, params) => {
          recordPublishedDiagnostics(params)
          // Return false so @codemirror/lsp-client's serverDiagnostics() also
          // renders squiggles in the active EditorView. While diagnostics
          // wait for types, the push is only cached.
          return diagnosticsHidden
        },
      },
    },
  })

  /**
   * The check for the diagnostics file (ADR 0006), or `None` while the
   * worker's diagnostics aren't current. It reads the documents as the client
   * last sent them, and never forces a sync: called on every poll, that
   * would send each keystroke at once and keep the worker re-pulling. The
   * worker pulls every document after each change and pushes the
   * result with the document's version, so they are current once every
   * TypeScript document has a push for its current version, made after the
   * latest types mount, and no push came for `DIAGNOSTICS_QUIET_MS`
   * (cross-file pulls follow an edit after 200 ms). It never pulls by itself:
   * a document that crashes the language server must only be pulled by the
   * worker, which quarantines it.
   */
  const currentDiagnosticsCheck: Effect.Effect<
    Option.Option<DiagnosticsCheck>
  > = Effect.gen(function* () {
    const lspWorkspace = activeLspWorkspace
    const ws = activeWorkspace
    if (lspWorkspace === undefined || ws === undefined) return Option.none()
    // Library tabs are open documents too, but are never checked for a Run.
    const documents = lspWorkspace.files.filter(
      (file) => libraryUriToPath(file.uri, rootUri) === undefined,
    )
    const fresh = documents.every(
      (file) =>
        (pushedVersionByUri.get(file.uri) ?? 0) >= file.version &&
        (pushedAtByUri.get(file.uri) ?? 0) >= typesMountedAt,
    )
    if (!fresh || Date.now() - lastPushAt < DIAGNOSTICS_QUIET_MS) {
      return Option.none()
    }
    const open = new Set(documents.map((file) => file.uri))
    const byUri = new Map<string, ReadonlyArray<unknown>>()
    for (const [uri, raw] of lastDiagnosticsByUri) {
      if (!open.has(uri)) continue
      const message = JSON.parse(raw) as {
        readonly params: { readonly diagnostics?: ReadonlyArray<unknown> }
      }
      byUri.set(uri, message.params.diagnostics ?? [])
    }
    const sourceLine = (path: string, line: number) => {
      const uri = pathToWorkspaceUri(path, rootUri)
      const doc = documents.find((file) => file.uri === uri)?.doc
      return doc !== undefined && line >= 1 && line <= doc.lines
        ? doc.line(line).text
        : undefined
    }
    const files: Array<{ readonly path: string; readonly text: string }> = []
    for (const file of documents) {
      const path = workspaceUriToPath(file.uri, rootUri)
      if (path !== undefined) files.push({ path, text: file.doc.toString() })
    }
    const packageJson = yield* ws.readFile("package.json").pipe(Effect.option)
    if (Option.isSome(packageJson)) {
      files.push({ path: "package.json", text: packageJson.value })
    }
    return Option.some({
      files,
      errors: diagnosticErrorsOf(byUri, rootUri, sourceLine),
    })
  })

  const traceAtoms = makeTraceAtoms({ keepAlive: true })

  // The Container, its Dependencies, Terminal and Traces are optional and looked up with
  // `serviceOption`, so they are kept out of the runtime's type.
  const baseLayer = Layer.mergeAll(
    config.transportLayer,
    wsLayer.pipe(Layer.orDie),
    (config.containerLayer ?? Layer.empty) as Layer.Layer<never>,
  )
  const runtimeLayer =
    config.containerLayer === undefined
      ? baseLayer
      : (layerTraces(traceAtoms).pipe(
          Layer.provideMerge(layerTerminal({ command: config.shellCommand })),
          Layer.provideMerge(
            layerDependencies({ typesTimeout: config.typesTimeout }),
          ),
          Layer.provideMerge(baseLayer),
        ) as unknown as typeof baseLayer)
  const runtime = Atom.runtime(runtimeLayer).pipe(
    Atom.setIdleTTL(config.idleTTL ?? "2 seconds"),
  )

  const containerPhaseAtom = Atom.make<Option.Option<ContainerPhase>>(
    Option.none(),
  ).pipe(Atom.keepAlive)
  const installLogAtom = Atom.make<InstallLog>(emptyInstallLog).pipe(
    Atom.keepAlive,
  )
  const diagnosticsVisibleAtom = Atom.make(!diagnosticsHidden).pipe(
    Atom.keepAlive,
  )
  const terminalStateAtom = Atom.make<TerminalState>(initialTerminalState).pipe(
    Atom.keepAlive,
  )
  const terminalOutputAtom = Atom.make<TerminalOutput>(
    emptyTerminalOutput,
  ).pipe(Atom.keepAlive)

  /**
   * Shows the diagnostics held back while waiting for types. When types
   * mounted, the cached pushes predate them (all "Cannot find module"), and
   * the worker is already re-pulling, so they are dropped. Otherwise they
   * are the best there is, and are shown.
   */
  const releaseDiagnostics = (
    registry: AtomRegistry.AtomRegistry,
    typesMounted: boolean,
  ) => {
    if (!diagnosticsHidden) return
    diagnosticsHidden = false
    registry.set(diagnosticsVisibleAtom, true)
    if (typesMounted) {
      lastDiagnosticsByUri.clear()
      return
    }
    for (const raw of lastDiagnosticsByUri.values()) {
      const message = JSON.parse(raw) as { readonly params: object }
      summarizePublishedDiagnostics(message.params)
    }
    if (mountedFilePath !== undefined) {
      const cached = lastDiagnosticsByUri.get(
        pathToWorkspaceUri(mountedFilePath, rootUri),
      )
      if (cached !== undefined) session.replayIncoming(cached)
    }
  }

  /**
   * Mirrors the Workspace into the Container, runs installs and the types
   * copy (`Dependencies`), and tracks the phase while mounted. Mounted by
   * `editorAtom`, so the Container boots on page load, alongside the
   * language server rather than after it.
   */
  const containerAtom = runtime.atom(
    Effect.fnUntraced(function* () {
      const container = yield* Effect.serviceOption(Container)
      if (Option.isNone(container)) return
      const registry = yield* AtomRegistry.AtomRegistry
      const ws = yield* Workspace
      const deps = yield* Effect.serviceOption(Dependencies)
      if (Option.isNone(deps)) {
        yield* mirrorWorkspace(ws, container.value)
        return
      }
      yield* deps.value.stateChanges.pipe(
        Stream.runForEach((state) =>
          Effect.sync(() => {
            registry.set(
              containerPhaseAtom,
              Option.some(containerPhaseOf(state)),
            )
            if (
              state.types._tag === "mounted" &&
              state.types.info !== mountedTypesInfo
            ) {
              mountedTypesInfo = state.types.info
              typesMountedAt = Date.now()
            }
            if (state.diagnosticsVisible) {
              releaseDiagnostics(registry, state.types._tag === "mounted")
            }
          }),
        ),
        Effect.forkScoped,
      )
      yield* deps.value.installLogChanges.pipe(
        Stream.runForEach((log) =>
          Effect.sync(() => {
            registry.set(installLogAtom, log)
          }),
        ),
        Effect.forkScoped,
      )
      const terminal = yield* Effect.serviceOption(Terminal)
      if (Option.isSome(terminal)) {
        yield* terminal.value.stateChanges.pipe(
          Stream.runForEach((state) =>
            Effect.sync(() => {
              registry.set(terminalStateAtom, state)
            }),
          ),
          Effect.forkScoped,
        )
        yield* terminal.value.outputChanges.pipe(
          Stream.runForEach((output) =>
            Effect.sync(() => {
              registry.set(terminalOutputAtom, output)
            }),
          ),
          Effect.forkScoped,
        )
      }
      // The watch runner waits for this file before each Run (ADR 0006).
      yield* runDiagnosticsWriter({
        container: container.value,
        dependencies: deps.value,
        current: currentDiagnosticsCheck,
        wakeups: Stream.merge(diagnosticsPushes, ws.events),
      }).pipe(Effect.forkScoped)
      yield* mirrorWorkspace(ws, container.value, {
        onContainerChange: deps.value.onContainerChange,
        onChange: deps.value.onMirrorChange,
      })
    }),
  )

  const terminalFn = <A>(
    f: (terminal: TerminalService, input: A) => Effect.Effect<void>,
  ) =>
    runtime.fn<A>()(
      Effect.fnUntraced(function* (input) {
        const terminal = yield* Effect.serviceOption(Terminal)
        if (Option.isSome(terminal)) yield* f(terminal.value, input)
      }),
    )
  const openTerminalAtom = terminalFn<TerminalSize>((terminal, size) =>
    terminal.open(size),
  )
  const resizeTerminalAtom = terminalFn<TerminalSize>((terminal, size) =>
    terminal.resize(size),
  )
  const terminalInputAtom = terminalFn<string>((terminal, data) =>
    terminal.input(data),
  )
  const clearTerminalAtom = terminalFn<void>((terminal) => terminal.clear)
  const restartRunAtom = terminalFn<void>((terminal) => terminal.restart)

  const elementAtom = Atom.make(Option.none<HTMLElement>())

  // Ctrl/Cmd+S formats with the Workspace's dprint.json.
  const formatter = makeDprintDocumentFormatter({
    readConfig: () =>
      activeWorkspace === undefined
        ? Promise.resolve(undefined)
        : Effect.runPromise(
            activeWorkspace
              .readFile("dprint.json")
              .pipe(Effect.option, Effect.map(Option.getOrUndefined)),
          ),
  })

  const createFileEditorState = (
    relPath: string,
    content: string,
    client: LSPClient,
    registry: AtomRegistry.AtomRegistry,
    ws: WorkspaceService,
  ): EditorState => {
    const uri = pathToWorkspaceUri(relPath, rootUri)
    const readOnly = isReadOnlyPath(relPath) || isLibraryPath(relPath)

    const updateListener = EditorView.updateListener.of((update) => {
      if (isSwappingState) return
      if (update.docChanged) {
        const text = update.state.doc.toString()
        editorStates.set(relPath, update.state)
        // Read-only files only change through the host, and external writes
        // (sync-back, the Container) are already in the Workspace.
        const external = update.transactions.some(
          (tr) => tr.annotation(externalWrite) === true,
        )
        if (!readOnly && !external) {
          void Effect.runPromise(
            ws.writeFile(relPath, text).pipe(
              Effect.catch((err) =>
                Effect.sync(() => {
                  registry.set(workspaceErrorAtom, Option.some(err.message))
                }),
              ),
            ),
          )
        }
      }
    })

    const cmdClickHandler = EditorView.domEventHandlers({
      mousedown(event, view) {
        if (!event.metaKey && !event.ctrlKey) {
          return false
        }
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos === null) {
          return false
        }
        event.preventDefault()
        view.dispatch({ selection: { anchor: pos } })
        jumpToDefinition(view)
        return true
      },
    })

    return EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        languageSupportForPath(relPath),
        isLspDocumentPath(relPath) || isLibraryDocumentPath(relPath)
          ? [client.plugin(uri, languageIdForPath(relPath)), cmdClickHandler]
          : [],
        readOnly ? EditorState.readOnly.of(true) : [],
        formatOnSave(formatter, relPath),
        updateListener,
        scratchpadEditorTheme,
      ],
    })
  }

  const refreshTree = (
    ws: WorkspaceService,
    registry: AtomRegistry.AtomRegistry,
  ) =>
    ws.getTree.pipe(
      Effect.tap((tree) =>
        Effect.sync(() => {
          registry.set(treeAtom, tree)
        }),
      ),
      Effect.asVoid,
    )

  const mountFileInView = (relPath: string): Effect.Effect<EditorView | null> =>
    Effect.gen(function* () {
      const view = activeView
      const client = activeClient
      const ws = activeWorkspace
      const registry = activeRegistry
      if (
        view === undefined ||
        client === undefined ||
        ws === undefined ||
        registry === undefined
      ) {
        return null
      }

      // Library files come from the language server's file system (where
      // the installed declarations are). Without one, there is no tab.
      let libraryContent: string | undefined
      if (isLibraryPath(relPath) && !editorStates.has(relPath)) {
        const content =
          activeMirror === undefined
            ? Option.none<string>()
            : yield* activeMirror.readFile(relPath)
        if (Option.isNone(content)) return null
        libraryContent = content.value
      }

      // Open tab if not already in tab bar
      const tabs = registry.get(openTabsAtom)
      if (!tabs.includes(relPath)) {
        registry.set(openTabsAtom, [...tabs, relPath])
      }
      registry.set(activeFileAtom, Option.some(relPath))

      if (mountedFilePath === relPath) {
        return view
      }

      // Save current file's EditorState (undo history, cursor, selection)
      if (mountedFilePath !== undefined) {
        editorStates.set(mountedFilePath, view.state)
      }

      let nextState = editorStates.get(relPath)
      if (nextState === undefined) {
        const contentResult =
          libraryContent !== undefined
            ? Option.some(libraryContent)
            : yield* ws.readFile(relPath).pipe(Effect.option)
        if (Option.isNone(contentResult)) {
          return null
        }
        nextState = createFileEditorState(
          relPath,
          contentResult.value,
          client,
          registry,
          ws,
        )
        editorStates.set(relPath, nextState)
      }

      isSwappingState = true
      try {
        view.setState(nextState)
        mountedFilePath = relPath
      } finally {
        isSwappingState = false
      }

      // Replay cached diagnostics for this file so squiggles render immediately
      const uri = pathToWorkspaceUri(relPath, rootUri)
      const cachedDiag = lastDiagnosticsByUri.get(uri)
      if (cachedDiag !== undefined) {
        session.replayIncoming(cachedDiag)
      }

      return view
    })

  switchViewToFile = mountFileInView

  /**
   * Brings an open file up to date after a write that didn't come from the
   * editor: the host's sync-back of a read-only file (`package.json`,
   * `pnpm-lock.yaml`), or any file the Container changed (two-way sync).
   * The edit covers only the changed span, so the cursor stays put where it
   * can, and the language server gets it like any other edit.
   */
  const applyExternalWrite = (
    relPath: string,
    content: string,
    fromContainer: boolean,
  ) => {
    if (!fromContainer && !isReadOnlyPath(relPath)) return
    const view = activeView
    const mounted = view !== undefined && mountedFilePath === relPath
    const state = mounted ? view.state : editorStates.get(relPath)
    if (state !== undefined) {
      const current = state.doc.toString()
      if (current === content) return
      const spec = {
        changes: changedSpan(current, content),
        annotations: externalWrite.of(true),
      }
      if (mounted) {
        view.dispatch(spec)
        return
      }
      editorStates.set(relPath, state.update(spec).state)
    }
    // Not in a view: the language server's copy is updated directly.
    activeLspWorkspace?.upsertWorkspaceFile(relPath, content)
  }

  /** Closes the tabs and drops the editor state of files that are gone. */
  const forgetFiles = (
    registry: AtomRegistry.AtomRegistry,
    isDeleted: (path: string) => boolean,
    deletedFiles: ReadonlyArray<string>,
  ) =>
    Effect.gen(function* () {
      for (const path of deletedFiles) {
        activeLspWorkspace?.removeWorkspaceFile(path)
        editorStates.delete(path)
        lastDiagnosticsByUri.delete(pathToWorkspaceUri(path, rootUri))
      }

      const prevDiags = registry.get(diagnosticsAtom)
      const nextDiags = new Map<string, FileDiagnosticSummary>()
      for (const [k, v] of prevDiags.entries()) {
        if (!isDeleted(k)) {
          nextDiags.set(k, v)
        }
      }
      registry.set(diagnosticsAtom, nextDiags)

      const prevTabs = registry.get(openTabsAtom)
      const nextTabs = prevTabs.filter((t) => !isDeleted(t))
      registry.set(openTabsAtom, nextTabs)

      const prevActive = registry.get(activeFileAtom)
      if (Option.isSome(prevActive) && isDeleted(prevActive.value)) {
        mountedFilePath = undefined
        const fallback = nextTabs[0]
        if (fallback !== undefined) {
          yield* mountFileInView(fallback)
        } else {
          registry.set(activeFileAtom, Option.none())
        }
      }
    })

  const editorAtom = runtime.atom(
    Effect.fnUntraced(function* (get) {
      get.mount(containerAtom)
      const registry = yield* AtomRegistry.AtomRegistry
      const ws = yield* Workspace
      const el = yield* get.some(elementAtom)
      const client = yield* get.result(session.clientAtom)

      activeRegistry = registry
      activeWorkspace = ws
      activeClient = client

      // A language server with its own file system (the in-browser worker)
      // gets every Workspace change, including files that are not open in a
      // tab. Subscribe before listing so no change falls in between.
      const mirror = yield* Effect.serviceOption(LspWorkspaceMirror)
      activeMirror = Option.getOrUndefined(mirror)
      if (Option.isSome(mirror)) {
        yield* ws.events.pipe(
          Stream.runForEach((event) =>
            Effect.sync(() => {
              const op = workspaceEventToFsOp(event)
              if (op !== undefined) mirror.value.apply(op)
            }),
          ),
          Effect.forkScoped,
        )
        yield* Effect.yieldNow
      }

      // Host writes (Container sync-back) and the Container's own changes
      // (two-way sync) add and delete files the explorer has not seen, and
      // change files that may be open.
      yield* ws.events.pipe(
        Stream.runForEach((event) => {
          switch (event._tag) {
            case "FileChanged": {
              const fromContainer = event.origin === "container"
              applyExternalWrite(event.path, event.content, fromContainer)
              return fromContainer || isReadOnlyPath(event.path)
                ? refreshTree(ws, registry).pipe(Effect.ignore)
                : Effect.void
            }
            case "FileCreated":
              if (event.origin === "container") {
                activeLspWorkspace?.upsertWorkspaceFile(
                  event.path,
                  event.content,
                )
              } else {
                applyExternalWrite(event.path, event.content, false)
              }
              return refreshTree(ws, registry).pipe(Effect.ignore)
            case "FileDeleted":
              return event.origin === "container"
                ? forgetFiles(registry, (path) => path === event.path, [
                    event.path,
                  ]).pipe(
                    Effect.andThen(refreshTree(ws, registry)),
                    Effect.ignore,
                  )
                : refreshTree(ws, registry).pipe(Effect.ignore)
            default:
              return refreshTree(ws, registry).pipe(Effect.ignore)
          }
        }),
        Effect.forkScoped,
      )

      // Seed LSP workspace with all files from Effect Workspace before/on connect
      const allFiles = yield* ws.listFiles.pipe(Effect.orDie)
      if (Option.isSome(mirror)) {
        mirror.value.apply({
          _tag: "Reset",
          files: Object.fromEntries(allFiles.map((f) => [f.path, f.content])),
        })
      }
      for (const file of allFiles) {
        activeLspWorkspace?.upsertWorkspaceFile(file.path, file.content)
      }
      yield* refreshTree(ws, registry).pipe(Effect.orDie)

      const initialActive = registry.get(activeFileAtom)
      const initialPath = Option.isSome(initialActive)
        ? initialActive.value
        : allFiles[0]?.path

      const view = yield* Effect.acquireRelease(
        Effect.sync(() => {
          el.replaceChildren()

          let initialState: EditorState
          if (initialPath !== undefined) {
            const initialEntry = allFiles.find((f) => f.path === initialPath)
            const content = initialEntry?.content ?? ""
            initialState = createFileEditorState(
              initialPath,
              content,
              client,
              registry,
              ws,
            )
            editorStates.set(initialPath, initialState)
            mountedFilePath = initialPath
          } else {
            initialState = EditorState.create({
              doc: "",
              extensions: [basicSetup, scratchpadEditorTheme],
            })
            mountedFilePath = undefined
          }

          const created = createEditorView({ parent: el, state: initialState })
          activeView = created
          return created
        }),
        (v) =>
          Effect.sync(() => {
            if (activeView === v) {
              activeView = undefined
              mountedFilePath = undefined
            }
            v.destroy()
          }),
      )

      return { view, client, workspace: ws } as const
    }),
  )

  const openFileAtom = runtime.fn<string>()(
    Effect.fnUntraced(function* (relPath) {
      const registry = yield* AtomRegistry.AtomRegistry
      registry.set(workspaceErrorAtom, Option.none())
      yield* mountFileInView(relPath)
    }),
  )

  const closeTabAtom = runtime.fn<string>()(
    Effect.fnUntraced(function* (relPath) {
      const registry = yield* AtomRegistry.AtomRegistry
      const tabs = registry.get(openTabsAtom)
      const idx = tabs.indexOf(relPath)
      if (idx === -1) return

      const nextTabs = tabs.filter((t) => t !== relPath)
      registry.set(openTabsAtom, nextTabs)

      const currentActive = registry.get(activeFileAtom)
      if (Option.isSome(currentActive) && currentActive.value === relPath) {
        if (activeView !== undefined && mountedFilePath === relPath) {
          editorStates.set(relPath, activeView.state)
        }
        const nextActive = nextTabs[Math.min(idx, nextTabs.length - 1)]
        if (nextActive !== undefined) {
          yield* mountFileInView(nextActive)
        } else {
          registry.set(activeFileAtom, Option.none())
          mountedFilePath = undefined
        }
      }

      // A library file exists only while its tab is open.
      if (isLibraryPath(relPath)) {
        editorStates.delete(relPath)
        activeLspWorkspace?.removeWorkspaceFile(relPath)
        const uri = pathToWorkspaceUri(relPath, rootUri)
        lastDiagnosticsByUri.delete(uri)
        pushedVersionByUri.delete(uri)
      }
    }),
  )

  const createFileAtom = runtime.fn<CreateFileInput>()(
    Effect.fnUntraced(function* (input) {
      const registry = yield* AtomRegistry.AtomRegistry
      const ws = yield* Workspace
      registry.set(workspaceErrorAtom, Option.none())

      const content = input.content ?? ""
      const res = yield* ws.createFile(input.path, content).pipe(Effect.result)
      if (res._tag === "Failure") {
        registry.set(workspaceErrorAtom, Option.some(res.failure.message))
        return
      }

      const normalized = input.path
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "")
      activeLspWorkspace?.upsertWorkspaceFile(normalized, content)
      yield* refreshTree(ws, registry).pipe(Effect.ignore)
      yield* mountFileInView(normalized)
    }),
  )

  const createDirectoryAtom = runtime.fn<string>()(
    Effect.fnUntraced(function* (dirPath) {
      const registry = yield* AtomRegistry.AtomRegistry
      const ws = yield* Workspace
      registry.set(workspaceErrorAtom, Option.none())

      const res = yield* ws.createDirectory(dirPath).pipe(Effect.result)
      if (res._tag === "Failure") {
        registry.set(workspaceErrorAtom, Option.some(res.failure.message))
        return
      }
      yield* refreshTree(ws, registry).pipe(Effect.ignore)
    }),
  )

  const renamePathAtom = runtime.fn<RenamePathInput>()(
    Effect.fnUntraced(function* ({ oldPath, newPath }) {
      const registry = yield* AtomRegistry.AtomRegistry
      const ws = yield* Workspace
      registry.set(workspaceErrorAtom, Option.none())

      // Flush mounted file edits to workspace before rename
      if (activeView !== undefined && mountedFilePath !== undefined) {
        editorStates.set(mountedFilePath, activeView.state)
      }

      const beforeFiles = yield* ws.listFiles.pipe(
        Effect.orElseSucceed(() => []),
      )
      const res = yield* ws.rename(oldPath, newPath).pipe(Effect.result)
      if (res._tag === "Failure") {
        registry.set(workspaceErrorAtom, Option.some(res.failure.message))
        return
      }

      const afterFiles = yield* ws.listFiles.pipe(
        Effect.orElseSucceed(() => []),
      )
      const cleanOld = oldPath.trim().replace(/^\/+/, "").replace(/\/+$/, "")
      const cleanNew = newPath.trim().replace(/^\/+/, "").replace(/\/+$/, "")

      const remapPath = (p: string): string => {
        if (p === cleanOld) return cleanNew
        if (p.startsWith(`${cleanOld}/`)) {
          return `${cleanNew}${p.slice(cleanOld.length)}`
        }
        return p
      }

      // Sync LSP workspace: close removed/old URIs and open new URIs
      const afterPaths = new Set(afterFiles.map((f) => f.path))
      for (const prev of beforeFiles) {
        if (!afterPaths.has(prev.path)) {
          activeLspWorkspace?.removeWorkspaceFile(prev.path)
          lastDiagnosticsByUri.delete(pathToWorkspaceUri(prev.path, rootUri))
        }
      }
      for (const next of afterFiles) {
        activeLspWorkspace?.upsertWorkspaceFile(next.path, next.content)
      }

      // Drop cached EditorStates for renamed paths so new URI plugins attach cleanly
      for (const key of Array.from(editorStates.keys())) {
        if (key === cleanOld || key.startsWith(`${cleanOld}/`)) {
          editorStates.delete(key)
        }
      }

      // Remap diagnostics map
      const prevDiags = registry.get(diagnosticsAtom)
      const nextDiags = new Map<string, FileDiagnosticSummary>()
      for (const [k, v] of prevDiags.entries()) {
        if (k !== cleanOld && !k.startsWith(`${cleanOld}/`)) {
          nextDiags.set(k, v)
        }
      }
      registry.set(diagnosticsAtom, nextDiags)

      // Remap open tabs and active file
      const nextTabs = registry.get(openTabsAtom).map(remapPath)
      registry.set(openTabsAtom, nextTabs)

      const prevActive = registry.get(activeFileAtom)
      yield* refreshTree(ws, registry).pipe(Effect.ignore)

      if (Option.isSome(prevActive)) {
        const remappedActive = remapPath(prevActive.value)
        if (remappedActive !== prevActive.value) {
          mountedFilePath = undefined
          yield* mountFileInView(remappedActive)
        }
      }
    }),
  )

  const deletePathAtom = runtime.fn<string>()(
    Effect.fnUntraced(function* (targetPath) {
      const registry = yield* AtomRegistry.AtomRegistry
      const ws = yield* Workspace
      registry.set(workspaceErrorAtom, Option.none())

      const beforeFiles = yield* ws.listFiles.pipe(
        Effect.orElseSucceed(() => []),
      )
      const res = yield* ws.remove(targetPath).pipe(Effect.result)
      if (res._tag === "Failure") {
        registry.set(workspaceErrorAtom, Option.some(res.failure.message))
        return
      }

      const cleanTarget = targetPath
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "")
      const isDeleted = (p: string) =>
        p === cleanTarget || p.startsWith(`${cleanTarget}/`)

      yield* refreshTree(ws, registry).pipe(Effect.ignore)
      yield* forgetFiles(
        registry,
        isDeleted,
        beforeFiles.map((file) => file.path).filter(isDeleted),
      )
    }),
  )

  const replaceWorkspace = Effect.fnUntraced(function* ({
    files,
    entryPath: nextEntry,
  }: ReplaceWorkspaceInput) {
    const registry = yield* AtomRegistry.AtomRegistry
    const ws = yield* Workspace
    const beforeFiles = yield* ws.listFiles.pipe(Effect.orElseSucceed(() => []))
    yield* ws.restoreSnapshot({ version: 1, files })
    registry.set(workspaceErrorAtom, Option.none())

    for (const prev of beforeFiles) {
      activeLspWorkspace?.removeWorkspaceFile(prev.path)
      lastDiagnosticsByUri.delete(pathToWorkspaceUri(prev.path, rootUri))
    }
    for (const [path, content] of Object.entries(files)) {
      activeLspWorkspace?.upsertWorkspaceFile(path, content)
    }
    // Undo history and cursors belong to the old files.
    editorStates.clear()
    registry.set(diagnosticsAtom, new Map())
    yield* refreshTree(ws, registry).pipe(Effect.ignore)

    const entry =
      files[nextEntry] !== undefined ? nextEntry : Object.keys(files)[0]
    registry.set(openTabsAtom, entry === undefined ? [] : [entry])
    registry.set(activeFileAtom, Option.fromNullishOr(entry))
    mountedFilePath = undefined
    if (entry !== undefined) {
      yield* mountFileInView(entry)
    }
  })

  const revealPositionAtom = runtime.fn<RevealPositionInput>()(
    Effect.fnUntraced(function* ({ path, line, column }) {
      const view = yield* mountFileInView(path)
      if (view === null) return
      const doc = view.state.doc
      const target = doc.line(Math.min(Math.max(line, 1), doc.lines))
      const pos = Math.min(target.from + Math.max(column - 1, 0), target.to)
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      })
      view.focus()
    }),
  )

  const clearErrorAtom = runtime.fn<void>()(
    Effect.fnUntraced(function* () {
      const registry = yield* AtomRegistry.AtomRegistry
      registry.set(workspaceErrorAtom, Option.none())
    }),
  )

  return {
    runtime,
    elementAtom,
    statusAtom: session.statusAtom,
    containerPhaseAtom,
    installLogAtom,
    diagnosticsVisibleAtom,
    terminalStateAtom,
    terminalOutputAtom,
    openTerminalAtom,
    resizeTerminalAtom,
    terminalInputAtom,
    clearTerminalAtom,
    restartRunAtom,
    revealPositionAtom,
    traceAtoms,
    editorAtom,
    treeAtom,
    openTabsAtom,
    activeFileAtom,
    diagnosticsAtom,
    workspaceErrorAtom,
    reconnectAtom: session.reconnectAtom,
    openFileAtom,
    closeTabAtom,
    createFileAtom,
    createDirectoryAtom,
    renamePathAtom,
    deletePathAtom,
    clearErrorAtom,
    replaceWorkspace,
  }
}
