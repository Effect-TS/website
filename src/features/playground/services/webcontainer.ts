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
import { FileAlreadyExistsError, FileNotFoundError, FileValidationError } from "../domain/errors"
import { makeDirectory, makeFile, File, Directory, Workspace } from "../domain/workspace"
import * as DevToolsSchemaCompat from "./devtools/schema"
import { Loader } from "./loader"

const WEBCONTAINER_BIN_PATH = "node_modules/.bin:/usr/local/bin:/usr/bin:/bin"

const semaphore = Semaphore.makeUnsafe(1)

export class WebContainer extends Context.Service<WebContainer>()("app/WebContainer", {
  make: Effect.gen(function* () {
    const registry = yield* AtomRegistry.AtomRegistry

    // Only one instance of a web container can be running at a time
    yield* Effect.acquireRelease(Semaphore.take(semaphore, 1), () =>
      Semaphore.release(semaphore, 1),
    )

    const loader = yield* Loader

    const container = yield* Effect.acquireRelease(
      Effect.promise(() => WC.boot()).pipe(loader.withIndicator("Booting webcontainer")),
      (container) => Effect.sync(() => container.teardown()),
    )

    /**
     * Spawns `jsh`, a custom shell that ships with the WebContainer API.
     *
     * When the associated scope is closed, the process will be killed.
     */
    function createShell(cwd: string, terminal: { readonly cols: number; readonly rows: number }) {
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
      return Effect.fromNullishOr(monaco.editor.getModel(monaco.Uri.file(path))).pipe(
        Effect.mapError(() => new FileNotFoundError({ path })),
      )
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
        const oldModel = yield* getModel(oldPath)
        const newModel = yield* createModel(newPath, oldModel.getValue(), oldModel.getLanguageId())
        oldModel.dispose()
        return newModel
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
        yield* Effect.promise(() => container.fs.rm(path, { force: true, recursive: true }))
        const model = yield* getModel(path)
        model.dispose()
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

    const createWorkspaceHandle = Effect.fnUntraced(function* (workspace: Workspace) {
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
          await container.fs.rm(workspace.name, { recursive: true, force: true }).catch(() => {})
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
          container.fs.rm(workspace.name, { recursive: true, force: true }).catch(() => undefined),
        ).pipe(Effect.ignore)
      }

      /**
       * Validates the name of a workspace file.
       *
       * Returns a `FileValidationError` if the file name is not valid.
       */
      function validateFileName(fileName: string, fileType: Workspace.FileType) {
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
            onSome: (parent) => `${Option.getOrThrow(workspace.pathTo(parent))}/${fileName}`,
          })
          yield* fileType === "File"
            ? writeFile(workspace.relativePath(newPath), "", "typescript")
            : mkdir(workspace.relativePath(newPath))
          const node =
            fileType === "File" ? makeFile(fileName, "", true) : makeDirectory(fileName, [], true)
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
              ? makeFile(newName, typedNode.initialContent, typedNode.userManaged ?? false)
              : makeDirectory(newName, typedNode.children, typedNode.userManaged ?? false)
          const newWorkspace = workspace.replaceNode(typedNode, newNode)
          const oldPath: string = Option.getOrThrow(workspace.pathTo(typedNode))
          const newPath: string = Option.getOrThrow(newWorkspace.pathTo(newNode))
          yield* renameFile(workspace.relativePath(oldPath), workspace.relativePath(newPath))
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
      yield* Effect.acquireRelease(mountWorkspace(workspace), () => unmountWorkspace(workspace))

      return {
        workspace: workspaceRef,
        spawn: spawnInWorkspace,
        run: runInWorkspace,
        createFile: create,
        renameFile: rename,
        removeFile: remove,
      } as const
    })

    // Install the default files / executables into the container
    yield* installRuntimePackageJson()
    yield* installExe("run", runExe)
    yield* installExe("dev-tools-proxy", devToolsProxyExe)

    const devToolsEvents = yield* PubSub.sliding<DevToolsSchema.Request.WithoutPing>(128)
    yield* spawn("./dev-tools-proxy").pipe(
      Effect.tap((process) =>
        Stream.fromReadableStream({
          evaluate: () => process.output,
          onError: identity,
          releaseLockOnEnd: true,
        }).pipe(
          Stream.orDie,
          Stream.pipeThroughChannel(
            Ndjson.decodeSchemaString(Schema.toCodecJson(DevToolsSchemaCompat.Request))({
              ignoreEmptyLines: true,
            }),
          ),
          Stream.tapCause(Effect.logError),
          Stream.runForEach((event) =>
            event._tag === "Ping" ? Effect.void : PubSub.publish(devToolsEvents, event),
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
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(Layer.provide(Loader.layer))
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
    rootDir: Path.dirname(program),
    skipLibCheck: true,
    sourceMap: true,
    lib: ["ES2022", "DOM", "DOM.Iterable"]
  },
  files: [program]
}))

// Keep the compiler and program under this process so Ctrl+C releases jsh's PTY.
const TypeScript = require(Path.resolve("node_modules/typescript"))
const formatHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: TypeScript.sys.getCurrentDirectory,
  getNewLine: () => TypeScript.sys.newLine
}
const reportDiagnostic = (diagnostic) => {
  console.error(TypeScript.formatDiagnostic(diagnostic, formatHost))
}
const reportWatchStatus = (diagnostic) => {
  console.info(TypeScript.formatDiagnostic(diagnostic, formatHost))
}
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
