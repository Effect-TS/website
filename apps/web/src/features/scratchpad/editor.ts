import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import {
  jumpToDefinition,
  languageServerExtensions,
  type LSPClient,
  type LSPClientExtension,
} from "@codemirror/lsp-client"
import {
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
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Stream from "effect/Stream"
import { SCRATCHPAD_ENTRY_PATH, SCRATCHPAD_ROOT_URI } from "./config.ts"
import { Container, type ContainerPhase, mirrorWorkspace } from "./container.ts"
import {
  containerPhaseOf,
  Dependencies,
  emptyInstallLog,
  type InstallLog,
  layerDependencies,
} from "./dependencies.ts"
import { scratchpadEditorTheme } from "./editor-theme.ts"
import { SCRATCHPAD_SEED_FILES } from "./seed.ts"
import { isLspDocumentPath, MultiFileLspWorkspace } from "./lsp-workspace.ts"
import {
  makeScratchpadSession,
  type LspStatus,
  type ScratchpadSessionConfig,
} from "./session.ts"
import type { LspTransport } from "./transport.ts"
import { LspWorkspaceMirror, workspaceEventToFsOp } from "./worker-transport.ts"
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
  readonly fileUri?: string | undefined
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

export interface RenamePathInput {
  readonly oldPath: string
  readonly newPath: string
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
  rootUri: string,
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
    const entryFromUri =
      config.fileUri !== undefined
        ? workspaceUriToPath(config.fileUri, rootUri)
        : undefined
    const entry = config.entryPath ?? entryFromUri ?? SCRATCHPAD_ENTRY_PATH
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

export const makeScratchpadEditorSession = (
  config: ScratchpadEditorSessionConfig,
): ScratchpadEditorSession => {
  const rootUri = config.rootUri ?? SCRATCHPAD_ROOT_URI
  const { files: initialFiles, entryPath } = resolveInitialFiles(
    config,
    rootUri,
  )
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
  let mountedFilePath: string | undefined
  let isSwappingState = false

  const editorStates = new Map<string, EditorState>()
  const lastDiagnosticsByUri = new Map<string, string>()
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
      extensions: [...languageServerExtensions(), diagnosticCapabilities],
      workspace: (client) => {
        const ws = new MultiFileLspWorkspace(client, {
          rootUri,
          onDisplayFile: async (relPath) => {
            if (switchViewToFile === undefined) return null
            return Effect.runPromise(switchViewToFile(relPath))
          },
          onServerUpdateFile: (relPath, update: TransactionSpec) => {
            const existingState = editorStates.get(relPath)
            if (existingState !== undefined) {
              const nextState = existingState.update(update).state
              editorStates.set(relPath, nextState)
              const nextText = nextState.doc.toString()
              activeLspWorkspace?.upsertWorkspaceFile(relPath, nextText)
              if (activeWorkspace !== undefined) {
                void Effect.runPromise(
                  activeWorkspace
                    .writeFile(relPath, nextText)
                    .pipe(Effect.ignore),
                )
              }
            }
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

  // The Container and its Dependencies are optional and looked up with
  // `serviceOption`, so they are kept out of the runtime's type.
  const baseLayer = Layer.mergeAll(
    config.transportLayer,
    wsLayer.pipe(Layer.orDie),
    (config.containerLayer ?? Layer.empty) as Layer.Layer<never>,
  )
  const runtimeLayer =
    config.containerLayer === undefined
      ? baseLayer
      : (layerDependencies({ typesTimeout: config.typesTimeout }).pipe(
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
      yield* mirrorWorkspace(ws, container.value, {
        onChange: deps.value.onMirrorChange,
      })
    }),
  )

  const elementAtom = Atom.make(Option.none<HTMLElement>())

  const createFileEditorState = (
    relPath: string,
    content: string,
    client: LSPClient,
    registry: AtomRegistry.AtomRegistry,
    ws: WorkspaceService,
  ): EditorState => {
    const uri = pathToWorkspaceUri(relPath, rootUri)
    const readOnly = isReadOnlyPath(relPath)

    const updateListener = EditorView.updateListener.of((update) => {
      if (isSwappingState) return
      if (update.docChanged) {
        const text = update.state.doc.toString()
        editorStates.set(relPath, update.state)
        // Read-only files only change through the host, which already wrote
        // them to the Workspace.
        if (!readOnly) {
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
        isLspDocumentPath(relPath)
          ? [client.plugin(uri, languageIdForPath(relPath)), cmdClickHandler]
          : [],
        readOnly ? EditorState.readOnly.of(true) : [],
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
        const contentResult = yield* ws.readFile(relPath).pipe(Effect.option)
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
   * Brings an open read-only file (`package.json`, `pnpm-lock.yaml`) up to
   * date after the host wrote it (Container sync-back). Editor writes never
   * need this: the editor is where they came from.
   */
  const applyHostWrite = (relPath: string, content: string) => {
    if (!isReadOnlyPath(relPath)) return
    const view = activeView
    const mounted = view !== undefined && mountedFilePath === relPath
    const state = mounted ? view.state : editorStates.get(relPath)
    if (state === undefined) return
    const current = state.doc.toString()
    if (current === content) return
    const next = state.update({
      changes: { from: 0, to: current.length, insert: content },
    }).state
    editorStates.set(relPath, next)
    if (mounted) {
      isSwappingState = true
      try {
        view.setState(next)
      } finally {
        isSwappingState = false
      }
    }
  }

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

      // Host writes (Container sync-back) add files the explorer has not
      // seen and change read-only files that may be open.
      yield* ws.events.pipe(
        Stream.runForEach((event) => {
          switch (event._tag) {
            case "FileChanged":
              applyHostWrite(event.path, event.content)
              return isReadOnlyPath(event.path)
                ? refreshTree(ws, registry).pipe(Effect.ignore)
                : Effect.void
            case "FileCreated":
              applyHostWrite(event.path, event.content)
              return refreshTree(ws, registry).pipe(Effect.ignore)
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

      for (const prev of beforeFiles) {
        if (isDeleted(prev.path)) {
          activeLspWorkspace?.removeWorkspaceFile(prev.path)
          editorStates.delete(prev.path)
          lastDiagnosticsByUri.delete(pathToWorkspaceUri(prev.path, rootUri))
        }
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

      yield* refreshTree(ws, registry).pipe(Effect.ignore)

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
  }
}
