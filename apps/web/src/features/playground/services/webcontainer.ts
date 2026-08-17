import * as monaco from "@effect/monaco-editor/esm/vs/editor/editor.api"
import { WebContainer as WC, type FileSystemTree } from "@webcontainer/api"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as DevToolsSchema from "effect/unstable/devtools/DevToolsSchema"
import * as Ndjson from "effect/unstable/encoding/Ndjson"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import {
  FileAlreadyExistsError,
  FileNotFoundError,
  FileValidationError,
} from "../domain/errors"
import {
  makeDirectory,
  makeFile,
  File,
  Directory,
  Workspace,
} from "../domain/workspace"
import * as DevToolsSchemaCompat from "./devtools/schema"
import { Loader } from "./loader"

const WEBCONTAINER_BIN_PATH = "node_modules/.bin:/usr/local/bin:/usr/bin:/bin"

// v4 programs use the native devtools wire encoding, v3 programs the legacy
// one (compat schema). Span shapes decode under either, but metrics snapshots
// differ; native comes first so the default (v4) workspace decodes in one
// attempt and never falls back to the lossier compat member.
const DevToolsRequest = Schema.toCodecJson(
  Schema.Union([DevToolsSchema.Request, DevToolsSchemaCompat.Request]),
)

const semaphore = Semaphore.makeUnsafe(1)

export class WebContainer extends Context.Service<WebContainer>()(
  "app/WebContainer",
  {
    make: Effect.gen(function* () {
      const registry = yield* AtomRegistry.AtomRegistry

      // Only one instance of a web container can be running at a time
      yield* Effect.acquireRelease(Semaphore.take(semaphore, 1), () =>
        Semaphore.release(semaphore, 1),
      )

      const loader = yield* Loader

      const container = yield* Effect.acquireRelease(
        Effect.promise(() => WC.boot()).pipe(
          loader.withIndicator("Booting webcontainer"),
        ),
        (container) => Effect.sync(() => container.teardown()),
      )

      /**
       * Spawns `jsh`, a custom shell that ships with the WebContainer API.
       *
       * When the associated scope is closed, the process will be killed.
       */
      function createShell(
        cwd: string,
        terminal: { readonly cols: number; readonly rows: number },
      ) {
        return Effect.acquireRelease(
          Effect.promise(() =>
            container.spawn("jsh", [], {
              cwd,
              env: {
                PATH: WEBCONTAINER_BIN_PATH,
                NODE_NO_WARNINGS: "1",
              },
              terminal,
            }),
          ),
          (process) => Effect.sync(() => process.kill()),
        )
      }

      /**
       * Spawns the specified `command` into a `jsh` shell.
       *
       * When the associated scope is closed, the process will be killed.
       */
      function spawn(command: string, cwd?: string) {
        return Effect.acquireRelease(
          Effect.promise(() =>
            container.spawn("jsh", ["-c", command], {
              ...(cwd === undefined ? {} : { cwd }),
              env: { PATH: WEBCONTAINER_BIN_PATH },
            }),
          ),
          (process) => Effect.sync(() => process.kill()),
        )
      }

      /**
       * Spawns the specified `command` into a `jsh` shell and waits for the
       * program to exit.
       */
      function run(command: string, cwd?: string) {
        return spawn(command, cwd).pipe(
          Effect.flatMap((process) => Effect.promise(() => process.exit)),
          Effect.scoped,
        )
      }

      /**
       * Installs an executable into the root of the WebContainer file system.
       *
       * @param name The name of the executable file.
       * @param script The contents of the executable script.
       */
      function installExe(name: string, script: string) {
        return Effect.promise(async () => {
          await container.fs.writeFile(name, script)
          await container.spawn("chmod", ["+x", name])
        })
      }

      function installRuntimePackageJson() {
        return Effect.promise(() =>
          container.fs.writeFile(
            "package.json",
            JSON.stringify({ private: true, type: "commonjs" }, undefined, 2),
          ),
        )
      }

      /**
       * Attempts to retrieve the Monaco editor model at the specified path.
       *
       * Will return a `FileNotFoundError` if a file could not be found at the
       * specified path.
       */
      function getModel(path: string) {
        return Effect.fromNullishOr(
          monaco.editor.getModel(monaco.Uri.file(path)),
        ).pipe(Effect.mapError(() => new FileNotFoundError({ path })))
      }

      /**
       * Creates a new Monaco editor `ITextModel`.
       */
      function createModel(path: string, content: string, language: string) {
        return Effect.sync(() => {
          const uri = monaco.Uri.file(path)
          return monaco.editor.createModel(content, language, uri)
        })
      }

      /**
       * Attempts to read the content of the file at the specified path on
       * the WebContainer's file system and then set's the content of the
       * corresponding Monaco editor model to the read contents.
       *
       * Will return a `FileNotFoundError` if a file could not be found at the
       * specified path.
       */
      function readFile(path: string) {
        return readFileString(path).pipe(
          Effect.bindTo("content"),
          Effect.bind("model", () => getModel(path)),
          Effect.tap(({ content, model }) =>
            Effect.sync(() => {
              if (model.getValue() !== content) {
                model.setValue(content)
              }
            }),
          ),
          Effect.map(({ model }) => model),
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "readFile",
          }),
        )
      }

      /**
       * Attempts to read the content of the file at the specified path on
       * the WebContainer's file system.
       *
       * Will return a `FileNotFoundError` if a file could not be found at the
       * specified path.
       */
      function readFileString(path: string) {
        return Effect.tryPromise({
          try: () => container.fs.readFile(path),
          catch: () => new FileNotFoundError({ path }),
        }).pipe(
          Effect.map((bytes) => new TextDecoder().decode(bytes)),
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "readFileString",
          }),
        )
      }

      /**
       * Attempts to read the contents of the directory at the specified path on
       * the WebContainer's file system.
       */
      function readDirectory(path: string) {
        return Effect.tryPromise({
          try: () => container.fs.readdir(path, { withFileTypes: true }),
          catch: () => new FileNotFoundError({ path }),
        }).pipe(
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "readDirectory",
          }),
        )
      }

      /**
       * Gets or creates the Monaco editor model at the specified path and then
       * sets the content of the model to the content of the file read from the
       * WebContainer file system at the corresponding path.
       */
      function writeFile(path: string, content: string, language: string) {
        return getModel(path).pipe(
          Effect.tap((model) =>
            Effect.sync(() => {
              if (model.getValue() !== content) {
                model.setValue(content)
              }
            }),
          ),
          Effect.catch(() => createModel(path, content, language)),
          Effect.tap(() => writeFileString(path, content)),
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "writeFile",
          }),
        )
      }

      /**
       * Updates an existing file without recreating it if it was removed outside
       * the editor.
       */
      function updateFile(path: string, content: string) {
        return readFileString(path).pipe(
          Effect.andThen(writeFileString(path, content)),
        )
      }

      function loadModel(path: string, content: string, language: string) {
        return getModel(path).pipe(
          Effect.tap((model) =>
            Effect.sync(() => {
              if (model.getValue() !== content) {
                model.setValue(content)
              }
            }),
          ),
          Effect.catch(() => createModel(path, content, language)),
          Effect.asVoid,
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "loadModel",
          }),
        )
      }

      /**
       * Attempts to write provided content to the file at the specified path on
       * the WebContainer's file system.
       */
      function writeFileString(path: string, content: string) {
        return Effect.promise(() => container.fs.writeFile(path, content)).pipe(
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "writeFileString",
          }),
        )
      }

      /**
       * Attempts to rename the file at `oldPath` to the name provided by
       * `newPath` both in Monaco as well as on the WebContainer's file system.
       */
      function renameFile(oldPath: string, newPath: string) {
        return Effect.gen(function* () {
          yield* Effect.promise(() => container.fs.rename(oldPath, newPath))
          const models = monaco.editor
            .getModels()
            .filter(
              (model) =>
                model.uri.fsPath === oldPath ||
                model.uri.fsPath.startsWith(`${oldPath}/`),
            )
          yield* Effect.forEach(
            models,
            (model) => {
              const modelPath = model.uri.fsPath.replace(oldPath, newPath)
              return createModel(
                modelPath,
                model.getValue(),
                model.getLanguageId(),
              ).pipe(Effect.tap(() => Effect.sync(() => model.dispose())))
            },
            { discard: true },
          )
        }).pipe(
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "renameFile",
          }),
        )
      }

      /**
       * Attempts to remove the file at the specified path from both Monaco as
       * well as on the WebContainer's file system.
       */
      function removeFile(path: string) {
        return Effect.gen(function* () {
          yield* Effect.promise(() =>
            container.fs.rm(path, { force: true, recursive: true }),
          )
          yield* Effect.sync(() => {
            monaco.editor
              .getModels()
              .filter(
                (model) =>
                  model.uri.fsPath === path ||
                  model.uri.fsPath.startsWith(`${path}/`),
              )
              .forEach((model) => model.dispose())
          })
        }).pipe(
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "removeFile",
          }),
        )
      }

      function mkdir(path: string) {
        return Effect.tryPromise({
          try: () => container.fs.mkdir(path, { recursive: true }),
          catch: () => new FileAlreadyExistsError({ path }),
        }).pipe(
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WebContainer",
            method: "mkdir",
          }),
        )
      }

      function watchFile(path: string) {
        const changes = Stream.callback<void>((queue) => {
          const watcher = container.fs.watch(path, (_event) => {
            Queue.offerUnsafe(queue, void 0)
          })
          return Effect.addFinalizer(() => Effect.sync(() => watcher.close()))
        }).pipe(Stream.mapEffect(() => readFileString(path)))
        return Stream.fromEffect(readFileString(path)).pipe(
          Stream.concat(changes),
          Stream.changes,
          Stream.tapCause(Effect.logError),
        )
      }

      function watchWorkspace(
        path: string,
        shouldIgnore: (path: string) => boolean,
      ) {
        return Stream.callback<void>((queue) => {
          const watcher = container.fs.watch(
            path,
            { recursive: true },
            (_event, filename) => {
              const changedPath =
                typeof filename === "string"
                  ? filename
                  : new TextDecoder().decode(filename)
              if (!shouldIgnore(changedPath)) {
                Queue.offerUnsafe(queue, void 0)
              }
            },
          )
          return Effect.addFinalizer(() => Effect.sync(() => watcher.close()))
        })
      }

      const createWorkspaceHandle = Effect.fnUntraced(function* (
        workspace: Workspace,
      ) {
        const mutationLock = yield* Semaphore.make(1)
        const localWrites = new Map<string, string>()
        /**
         * Spawns the specified `command` into a `jsh` shell and returns the
         * associated `WebContainerProcess`.
         *
         * The command will be run in the root directory of the workspace.
         */
        function spawnInWorkspace(command: string) {
          return spawn(command, workspace.name)
        }

        /**
         * Spawns the specified `command` into a `jsh` shell and waits for the
         * program to exit.
         *
         * The command will be run in the root directory of the workspace.
         */
        function runInWorkspace(command: string) {
          return run(command, workspace.name)
        }

        /**
         * Mounts the specified workspace's file tree into the WebContainer.
         */
        function mountWorkspace(workspace: Workspace) {
          return Effect.promise(async () => {
            await container.fs
              .rm(workspace.name, { recursive: true, force: true })
              .catch(() => {})
            await container.fs.mkdir(workspace.name, { recursive: true })
            await container.mount(treeFromWorkspace(workspace), {
              mountPoint: workspace.name,
            })
          })
        }

        /**
         * Removes the workspace directory from the WebContainer file system.
         */
        function unmountWorkspace(workspace: Workspace) {
          return Effect.promise(() =>
            container.fs
              .rm(workspace.name, { recursive: true, force: true })
              .catch(() => undefined),
          ).pipe(Effect.ignore)
        }

        /**
         * Validates the name of a workspace file.
         *
         * Returns a `FileValidationError` if the file name is not valid.
         */
        function validateFileName(
          fileName: string,
          fileType: Workspace.FileType,
        ) {
          return Effect.gen(function* () {
            if (fileName.length === 0 || fileName.includes("/")) {
              return yield* new FileValidationError({ reason: "InvalidName" })
            } else if (fileType === "File" && !fileName.endsWith(".ts")) {
              return yield* new FileValidationError({
                reason: "UnsupportedType",
              })
            }
          })
        }

        /**
         * Creates a new file in the workspace.
         */
        const create = Effect.fnUntraced(
          function* (
            fileName: string,
            fileType: Workspace.FileType,
            options: Workspace.CreateFileOptions = {},
          ) {
            yield* validateFileName(fileName, fileType)
            const workspace: Workspace = registry.get(workspaceRef)
            const parent = Option.fromNullishOr(options.parent)
            // Determine the path to the new file
            const newPath = Option.match(parent, {
              onNone: () => fileName,
              onSome: (parent) =>
                `${Option.getOrThrow(workspace.pathTo(parent))}/${fileName}`,
            })
            yield* fileType === "File"
              ? writeFile(workspace.relativePath(newPath), "", "typescript")
              : mkdir(workspace.relativePath(newPath))
            const node =
              fileType === "File"
                ? makeFile(fileName, "", true)
                : makeDirectory(fileName, [], true)
            registry.set(
              workspaceRef,
              Option.match(parent, {
                onNone: () => workspace.append(node),
                onSome: (parent) =>
                  workspace.replaceNode(
                    parent,
                    makeDirectory(
                      parent.name,
                      [...parent.children, node],
                      parent.userManaged ?? false,
                    ),
                  ),
              }),
            )
            return node
          },
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WorkspaceHandle",
            method: "createFile",
          }),
        )

        /**
         * Renames a file in the workspace.
         */
        const rename = Effect.fnUntraced(
          function* (node: File | Directory, newName: string) {
            const typedNode: File | Directory = node
            yield* validateFileName(newName, typedNode._tag)
            const workspace: Workspace = registry.get(workspaceRef)
            const newNode: File | Directory =
              typedNode._tag === "File"
                ? makeFile(
                    newName,
                    typedNode.initialContent,
                    typedNode.userManaged ?? false,
                  )
                : makeDirectory(
                    newName,
                    typedNode.children,
                    typedNode.userManaged ?? false,
                  )
            const newWorkspace = workspace.replaceNode(typedNode, newNode)
            const oldPath: string = Option.getOrThrow(
              workspace.pathTo(typedNode),
            )
            const newPath: string = Option.getOrThrow(
              newWorkspace.pathTo(newNode),
            )
            yield* renameFile(
              workspace.relativePath(oldPath),
              workspace.relativePath(newPath),
            )
            registry.set(workspaceRef, newWorkspace)
            return newNode
          },
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WorkspaceHandle",
            method: "renameFile",
          }),
        )

        /**
         * Removes a file from the workspace.
         */
        const remove = Effect.fnUntraced(
          function* (node: File | Directory) {
            const typedNode: File | Directory = node
            const workspace: Workspace = registry.get(workspaceRef)
            const newWorkspace = workspace.removeNode(typedNode)
            const path: string = Option.getOrThrow(workspace.pathTo(typedNode))
            yield* removeFile(workspace.relativePath(path))
            registry.set(workspaceRef, newWorkspace)
          },
          Effect.tapCause(Effect.logError),
          Effect.annotateLogs({
            service: "WorkspaceHandle",
            method: "removeFile",
          }),
        )

        // Create a Atom to track changes to the workspace
        const workspaceRef = Atom.make(workspace)
        // Mount the workspace file system into the container and clean it up when
        // the scope closes
        yield* Effect.acquireRelease(mountWorkspace(workspace), () =>
          unmountWorkspace(workspace),
        )

        const reconcileWorkspace = mutationLock.withPermit(
          Effect.gen(function* () {
            const current = registry.get(workspaceRef)
            let scanned = yield* scanWorkspace(container, current)
            const restoredProtectedNodes = yield* restoreProtectedNodes(
              container,
              current,
              scanned.tree,
            )
            if (restoredProtectedNodes) {
              scanned = yield* scanWorkspace(container, current)
            }
            const next = current.setTree(scanned.tree)
            const nextFiles = new Set<string>()
            const currentFiles = new Map<string, File>()
            for (const [node, path] of current.filePaths) {
              if (node._tag === "File") {
                currentFiles.set(path, node)
              }
            }

            for (const [node, path] of next.filePaths) {
              if (node._tag !== "File") {
                continue
              }
              const fullPath = next.relativePath(path)
              nextFiles.add(fullPath)
              const content = scanned.contents.get(path)
              if (content === undefined) {
                continue
              }
              if (currentFiles.get(path) !== node) {
                const localContent = localWrites.get(fullPath)
                if (localContent === content) {
                  localWrites.delete(fullPath)
                  const model = yield* getModel(fullPath).pipe(Effect.option)
                  if (
                    Option.isNone(model) ||
                    model.value.getValue() === content
                  ) {
                    yield* loadModel(
                      fullPath,
                      content,
                      node.language ?? languageFromPath(path),
                    )
                  }
                } else {
                  localWrites.delete(fullPath)
                  yield* loadModel(
                    fullPath,
                    content,
                    node.language ?? languageFromPath(path),
                  )
                }
              }
            }

            for (const [node, path] of current.filePaths) {
              if (node._tag === "File") {
                const fullPath = current.relativePath(path)
                if (!nextFiles.has(fullPath)) {
                  localWrites.delete(fullPath)
                  yield* getModel(fullPath).pipe(
                    Effect.tap((model) => Effect.sync(() => model.dispose())),
                    Effect.catchTag("FileNotFoundError", () => Effect.void),
                  )
                }
              }
            }

            registry.set(workspaceRef, next)
          }),
        )

        yield* watchWorkspace(workspace.name, (changedPath) => {
          if (!isIgnoredWorkspacePath(changedPath)) {
            return false
          }
          const current = registry.get(workspaceRef)
          for (const [node, path] of current.filePaths) {
            if (
              node.userManaged !== true &&
              (path === changedPath ||
                path.startsWith(`${changedPath}/`) ||
                changedPath.startsWith(`${path}/`))
            ) {
              return false
            }
          }
          return true
        }).pipe(
          Stream.debounce("100 millis"),
          Stream.runForEach(() =>
            reconcileWorkspace.pipe(
              Effect.retry({ times: 2 }),
              Effect.catchCause((cause) => Effect.logError(cause)),
            ),
          ),
          Effect.forkScoped,
        )

        const resetWorkspace = (nextWorkspace: Workspace) =>
          mutationLock.withPermit(
            Effect.gen(function* () {
              const current = registry.get(workspaceRef)
              localWrites.clear()
              const entries = yield* readDirectory(workspace.name)
              yield* Effect.forEach(
                entries,
                (entry) =>
                  isIgnoredWorkspacePath(entry.name)
                    ? Effect.void
                    : Effect.promise(() =>
                        container.fs.rm(`${workspace.name}/${entry.name}`, {
                          recursive: true,
                          force: true,
                        }),
                      ),
                { concurrency: "unbounded", discard: true },
              )
              yield* Effect.promise(() =>
                container.mount(treeFromWorkspace(nextWorkspace), {
                  mountPoint: workspace.name,
                }),
              )
              const nextFiles = new Set<string>()
              for (const [node, path] of nextWorkspace.filePaths) {
                if (node._tag === "File") {
                  const fullPath = nextWorkspace.relativePath(path)
                  nextFiles.add(fullPath)
                  yield* loadModel(
                    fullPath,
                    node.initialContent,
                    node.language ?? languageFromPath(path),
                  )
                }
              }
              for (const [node, path] of current.filePaths) {
                if (node._tag === "File") {
                  const fullPath = current.relativePath(path)
                  if (!nextFiles.has(fullPath)) {
                    yield* getModel(fullPath).pipe(
                      Effect.tap((model) => Effect.sync(() => model.dispose())),
                      Effect.catchTag("FileNotFoundError", () => Effect.void),
                    )
                  }
                }
              }
              registry.set(workspaceRef, nextWorkspace)
            }),
          )

        return {
          workspace: workspaceRef,
          spawn: spawnInWorkspace,
          run: runInWorkspace,
          writeFile: (path: string, content: string, _language: string) =>
            mutationLock.withPermit(
              updateFile(path, content).pipe(
                Effect.tap(() =>
                  Effect.sync(() => localWrites.set(path, content)),
                ),
              ),
            ),
          createFile: (...args: Parameters<typeof create>) =>
            mutationLock.withPermit(create(...args)),
          renameFile: (...args: Parameters<typeof rename>) =>
            mutationLock.withPermit(rename(...args)),
          removeFile: (...args: Parameters<typeof remove>) =>
            mutationLock.withPermit(remove(...args)),
          resetWorkspace,
        } as const
      })

      // Install the default files / executables into the container
      yield* installRuntimePackageJson()
      yield* installExe("run", runExe)
      yield* installExe("dev-tools-proxy", devToolsProxyExe)

      const devToolsEvents =
        yield* PubSub.sliding<DevToolsSchema.Request.WithoutPing>(128)
      yield* spawn("./dev-tools-proxy").pipe(
        Effect.tap((process) =>
          Stream.fromReadableStream({
            evaluate: () => process.output,
            onError: identity,
            releaseLockOnEnd: true,
          }).pipe(
            Stream.orDie,
            Stream.pipeThroughChannel(
              Ndjson.decodeSchemaString(DevToolsRequest)({
                ignoreEmptyLines: true,
              }),
            ),
            Stream.tapCause(Effect.logError),
            Stream.runForEach((event) =>
              event._tag === "Ping"
                ? Effect.void
                : PubSub.publish(devToolsEvents, event),
            ),
          ),
        ),
        Effect.forever,
        Effect.forkScoped,
      )

      return {
        createShell,
        createWorkspaceHandle,
        devTools: Stream.fromPubSub(devToolsEvents),
        run,
        readFile,
        readFileString,
        readDirectory,
        renameFile,
        writeFile,
        writeFileString,
        loadModel,
        makeDirectory: mkdir,
        watchFile,
      } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Loader.layer),
  )
}

const ignoredWorkspacePaths = new Set([".tsc-run.json", "dist", "node_modules"])
function isIgnoredWorkspacePath(path: string) {
  const [root] = path.replace(/^\.\//, "").split("/")
  return root !== undefined && ignoredWorkspacePaths.has(root)
}

function languageFromPath(path: string) {
  if (path.endsWith(".json")) return "json"
  if (path.endsWith(".tsx")) return "typescriptreact"
  if (path.endsWith(".jsx")) return "javascriptreact"
  if (/\.(?:c|m)?js$/.test(path)) return "javascript"
  if (/\.(?:c|m)?ts$/.test(path)) return "typescript"
  return "plaintext"
}

function scanWorkspace(container: WC, workspace: Workspace) {
  return Effect.tryPromise({
    try: async () => {
      const contents = new Map<string, string>()
      const existingPaths = new Map<string, File | Directory>()
      for (const [node, path] of workspace.filePaths) {
        existingPaths.set(path, node)
      }

      async function walk(
        directoryPath: string,
        prefix: string,
        existingChildren: Workspace["tree"],
      ): Promise<Workspace["tree"]> {
        const entries = await container.fs.readdir(directoryPath, {
          withFileTypes: true,
        })
        const existingOrder = new Map(
          existingChildren.map((node, index) => [node.name, index]),
        )
        entries.sort((left, right) => {
          const leftIndex = existingOrder.get(left.name)
          const rightIndex = existingOrder.get(right.name)
          if (leftIndex !== undefined && rightIndex !== undefined)
            return leftIndex - rightIndex
          if (leftIndex !== undefined) return -1
          if (rightIndex !== undefined) return 1
          return left.name.localeCompare(right.name)
        })

        const tree: Array<File | Directory> = []
        for (const entry of entries) {
          const path = `${prefix}${entry.name}`
          const existing = existingPaths.get(path)
          if (
            isIgnoredWorkspacePath(path) &&
            (existing === undefined || existing.userManaged === true)
          ) {
            continue
          }
          if (entry.isDirectory()) {
            const existingDirectory =
              existing?._tag === "Directory" ? existing : undefined
            const children = await walk(
              `${directoryPath}/${entry.name}`,
              `${path}/`,
              existingDirectory?.children ?? [],
            )
            const unchanged =
              existingDirectory !== undefined &&
              existingDirectory.children.length === children.length &&
              existingDirectory.children.every(
                (child, index) => child === children[index],
              )
            tree.push(
              unchanged
                ? existingDirectory
                : makeDirectory(
                    entry.name,
                    children,
                    existingDirectory?.userManaged ?? true,
                  ),
            )
          } else if (entry.isFile()) {
            const bytes = await container.fs.readFile(
              `${directoryPath}/${entry.name}`,
            )
            let content: string
            try {
              content = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
            } catch {
              continue
            }
            contents.set(path, content)
            tree.push(
              existing?._tag === "File" && existing.initialContent === content
                ? existing
                : new File({
                    name: entry.name,
                    initialContent: content,
                    language:
                      existing?._tag === "File"
                        ? (existing.language ?? languageFromPath(path))
                        : languageFromPath(path),
                    userManaged:
                      existing?._tag === "File"
                        ? (existing.userManaged ?? true)
                        : true,
                  }),
            )
          }
        }
        return tree
      }

      return {
        contents,
        tree: await walk(workspace.name, "", workspace.tree),
      }
    },
    catch: () => new FileNotFoundError({ path: workspace.name }),
  })
}

function restoreProtectedNodes(
  container: WC,
  workspace: Workspace,
  scannedTree: Workspace["tree"],
) {
  return Effect.tryPromise({
    try: async () => {
      const scannedPaths = new Map<string, File | Directory>()
      const scannedWorkspace = workspace.setTree(scannedTree)
      for (const [node, path] of scannedWorkspace.filePaths) {
        scannedPaths.set(path, node)
      }

      let restored = false
      for (const [node, path] of workspace.filePaths) {
        if (
          node.userManaged === true ||
          scannedPaths.get(path)?._tag === node._tag
        ) {
          continue
        }

        const fullPath = workspace.relativePath(path)
        await container.fs.rm(fullPath, { recursive: true, force: true })
        if (node._tag === "Directory") {
          await container.fs.mkdir(fullPath, { recursive: true })
        } else {
          const separator = fullPath.lastIndexOf("/")
          if (separator >= 0) {
            await container.fs.mkdir(fullPath.slice(0, separator), {
              recursive: true,
            })
          }
          await container.fs.writeFile(fullPath, node.initialContent)
        }
        restored = true
      }
      return restored
    },
    catch: () => new FileNotFoundError({ path: workspace.name }),
  })
}

function treeFromWorkspace(workspace: Workspace): FileSystemTree {
  function walk(children: Workspace["tree"]): FileSystemTree {
    const tree: FileSystemTree = {}
    children.forEach((child) => {
      if (child._tag === "File") {
        tree[child.name] = {
          file: { contents: child.initialContent },
        }
      } else {
        tree[child.name] = {
          directory: walk(child.children),
        }
      }
    })
    return tree
  }
  return walk(workspace.tree)
}

const runExe = `#!/usr/bin/env node
const ChildProcess = require("node:child_process")
const Fs = require("node:fs")
const Path = require("node:path")

const outDir = "dist"
const program = process.argv[2]
const compiledProgram = Path.join(outDir, Path.basename(program).replace(/\\.ts$/, ".js"))
const configPath = ".tsc-run.json"

const hasUserConfig = Fs.existsSync("tsconfig.json")
Fs.writeFileSync(configPath, JSON.stringify({
  ...(hasUserConfig ? { extends: "./tsconfig.json" } : {}),
  compilerOptions: {
    ...(hasUserConfig ? {} : {
      module: "nodenext",
      target: "esnext"
    }),
    outDir,
    preserveWatchOutput: false,
    rootDir: Path.dirname(program),
    skipLibCheck: true,
    sourceMap: true,
    lib: ["ES2022", "DOM", "DOM.Iterable"]
  },
  files: [program]
}))

// Keep the compiler and program under this process so Ctrl+C releases jsh's PTY.
const TypeScript = require(Path.resolve("node_modules/typescript"))
const reportDiagnostic = TypeScript.createDiagnosticReporter(TypeScript.sys, true)
const reportWatchStatus = TypeScript.createWatchStatusReporter(TypeScript.sys, true)
const host = TypeScript.createWatchCompilerHost(
  configPath,
  {},
  TypeScript.sys,
  TypeScript.createSemanticDiagnosticsBuilderProgram,
  reportDiagnostic,
  reportWatchStatus
)
const afterProgramCreate = host.afterProgramCreate
let running

host.afterProgramCreate = (builder) => {
  afterProgramCreate?.(builder)
  running?.kill("SIGKILL")
  running = undefined
  const diagnostics = TypeScript.getPreEmitDiagnostics(builder.getProgram())
  if (diagnostics.length === 0) {
    running = ChildProcess.spawn(process.execPath, [
      "--enable-source-maps",
      compiledProgram
    ], {
      stdio: "inherit"
    })
  }
}

const watcher = TypeScript.createWatchProgram(host)

function stop(exitCode) {
  running?.kill("SIGKILL")
  watcher.close()
  process.exit(exitCode)
}

process.once("SIGINT", () => stop(130))
process.once("SIGTERM", () => stop(143))
`

const devToolsProxyExe = `#!/usr/bin/env node
const Net = require("node:net")

const server = Net.createServer((socket) => {
  socket.on("error", () => {})
  socket.pipe(process.stdout, { end: false })
})
process.stdout.on("error", () => {})
server.on("error", () => {})

server.listen(34437)
`
