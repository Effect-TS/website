import { Request } from "@effect/experimental/DevTools/Domain"
import * as Ndjson from "@effect/experimental/Ndjson"
import { WebContainer as WC, type FileSystemTree } from "@webcontainer/api"
import * as monaco from "@effect/monaco-editor/esm/vs/editor/editor.api"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as GlobalValue from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { FileAlreadyExistsError, FileNotFoundError, FileValidationError } from "../domain/errors"
import { makeDirectory, makeFile, File, Directory, Workspace } from "../domain/workspace"
import { Loader } from "./loader"

const WEBCONTAINER_BIN_PATH = "node_modules/.bin:/usr/local/bin:/usr/bin:/bin"

const semaphore = GlobalValue.globalValue("app/WebContainer/semaphore", () =>
  Effect.unsafeMakeSemaphore(1)
)

export class WebContainer extends Effect.Service<WebContainer>()("app/WebContainer", {
  accessors: true,
  dependencies: [Loader.Default],
  scoped: Effect.gen(function*() {
    // Only one instance of a WebContainer can be running at any given time
    yield* Effect.acquireRelease(semaphore.take(1), () => semaphore.release(1))

    const loader = yield* Loader

    const container = yield* Effect.acquireRelease(
      Effect.promise(() => WC.boot()).pipe(loader.withIndicator("Booting webcontainer")),
      (container) => Effect.sync(() => container.teardown())
    )

    /**
     * Spawns `jsh`, a custom shell that ships with the WebContainer API.
     *
     * When the associated scope is closed, the process will be killed.
     */
    const createShell = Effect.acquireRelease(
      Effect.promise(() =>
        container.spawn("jsh", [], {
          env: {
            PATH: WEBCONTAINER_BIN_PATH,
            NODE_NO_WARNINGS: "1"
          }
        })
      ),
      (process) => Effect.sync(() => process.kill())
    )

    /**
     * Spawns the specified `command` into a `jsh` shell.
     *
     * When the associated scope is closed, the process will be killed.
     */
    function spawn(command: string) {
      return Effect.acquireRelease(
        Effect.promise(() =>
          container.spawn("jsh", ["-c", command], {
            env: {
              PATH: WEBCONTAINER_BIN_PATH
            }
          })
        ),
        (process) => Effect.sync(() => process.kill())
      )
    }

    /**
      * Spawns the specified `command` into a `jsh` shell and waits for the 
      * program to exit.
      */
    function run(command: string) {
      return spawn(command).pipe(
        Effect.flatMap((process) => Effect.promise(() => process.exit)),
        Effect.scoped
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

    /**
      * Attempts to retrieve the Monaco editor model at the specified path.
      *
      * Will return a `FileNotFoundError` if a file could not be found at the
      * specified path.
      */
    function getModel(path: string) {
      return Effect.fromNullable(monaco.editor.getModel(monaco.Uri.file(path))).pipe(
        Effect.mapError(() => new FileNotFoundError({ path }))
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
        Effect.tap(({ content, model }) => {
          // Prevent constantly re-triggerring `IModelContentChanged` events
          if (model.getValue() !== content) {
            model.setValue(content)
          }
        }),
        Effect.map(({ model }) => model),
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "readFile"
        })
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
        catch: () => new FileNotFoundError({ path })
      }).pipe(
        Effect.map((bytes) => new TextDecoder().decode(bytes)),
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "readFileString"
        })
      )
    }

    /**
     * Attempts to read the contents of the directory at the specified path on
     * the WebContainer's file system.
     */
    function readDirectory(path: string) {
      return Effect.tryPromise({
        try: () => container.fs.readdir(path, { withFileTypes: true }),
        catch: () => new FileNotFoundError({ path })
      }).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "readDirectory"
        })
      )
    }

    /**
      * Gets or creates the Monaco editor model at the specified path and then
      * sets the content of the model to the content of the file read from the 
      * WebContainer file system at the corresponding path.
      */
    function writeFile(path: string, content: string, language: string) {
      return getModel(path).pipe(
        Effect.tap((model) => {
          // Prevent constantly re-triggerring `IModelContentChanged` events
          if (model.getValue() !== content) {
            model.setValue(content)
          }
        }),
        Effect.orElse(() => createModel(path, content, language)),
        Effect.zipLeft(writeFileString(path, content))
      ).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "writeFile"
        })
      )
    }

    /**
      * Attempts to write provided content to the file at the specified path on
      * the WebContainer's file system.
      */
    function writeFileString(path: string, content: string) {
      return Effect.promise(() => container.fs.writeFile(path, content)).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "writeFileString"
        })
      )
    }

    /**
      * Attempts to rename the file at `oldPath` to the name provided by 
      * `newPath` both in Monaco as well as on the WebContainer's file system.
      */
    function renameFile(oldPath: string, newPath: string) {
      return Effect.gen(function*() {
        yield* Effect.promise(() => container.fs.rename(oldPath, newPath))
        const oldModel = yield* getModel(oldPath)
        const newModel = yield* createModel(newPath, oldModel.getValue(), oldModel.getLanguageId())
        oldModel.dispose()
        return newModel
      }).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "renameFile"
        })
      )
    }

    /**
      * Attempts to remove the file at the specified path from both Monaco as 
      * well as on the WebContainer's file system.
      */
    function removeFile(path: string) {
      return Effect.gen(function*() {
        yield* Effect.promise(() => container.fs.rm(path, { force: true, recursive: true }))
        const model = yield* getModel(path)
        model.dispose()
      }).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "removeFile"
        })
      )
    }

    function mkdir(path: string) {
      return Effect.tryPromise({
        try: () => container.fs.mkdir(path),
        catch: () => new FileAlreadyExistsError({ path })
      }).pipe(
        Effect.tapErrorCause(Effect.logError),
        Effect.annotateLogs({
          service: "WebContainer",
          method: "mkdir"
        })
      )
    }

    function watchFile(path: string) {
      const changes = Stream.async<void>((emit) => {
        const watcher = container.fs.watch(path, (_event) => {
          emit.single(void 0)
        })
        return Effect.sync(() => watcher.close())
      }).pipe(Stream.mapEffect(() => readFileString(path)))
      return readFileString(path).pipe(
        Stream.concat(changes),
        Stream.changes,
        Stream.tapErrorCause(Effect.logError)
      )
    }

    function createWorkspaceHandle(workspace: Workspace) {
      return Effect.gen(function*() {
        /**
          * Spawns the specified `command` into a `jsh` shell and returns the
          * associated `WebContainerProcess`.
          *
          * The command will be run in the root directory of the workspace.
          */
        function spawnInWorkspace(command: string) {
          return spawn(`cd ${workspace.name} && ${command}`)
        }

        /**
          * Spawns the specified `command` into a `jsh` shell and waits for the 
          * program to exit.
          *
          * The command will be run in the root directory of the workspace.
          */
        function runInWorkspace(command: string) {
          return run(`cd ${workspace.name} && ${command}`)
        }

        /**
          * Mounts the specified workspace's file tree into the WebContainer.
          */
        function mountWorkspace(workspace: Workspace) {
          return Effect.promise(async () => {
            await container.fs.mkdir(workspace.name, { recursive: true })
            await container.mount(treeFromWorkspace(workspace), {
              mountPoint: workspace.name
            })
          })
        }

        /**
         * Validates the name of a workspace file.
         *
         * Returns a `FileValidationError` if the file name is not valid.
         */
        function validateFileName(fileName: string, fileType: Workspace.FileType) {
          return Effect.gen(function*() {
            if (fileName.length === 0 || fileName.includes("/")) {
              return yield* new FileValidationError({ reason: "InvalidName" })
            } else if (fileType === "File" && !fileName.endsWith(".ts")) {
              return yield* new FileValidationError({
                reason: "UnsupportedType"
              })
            }
          })
        }

        /**
         * Creates a new file in the workspace.
         */
        function create(
          fileName: string,
          fileType: Workspace.FileType,
          options: Workspace.CreateFileOptions = {}
        ) {
          return Effect.gen(function*() {
            yield* validateFileName(fileName, fileType)
            const workspace = yield* SubscriptionRef.get(workspaceRef)
            const parent = Option.fromNullable(options.parent)
            // Determine the path to the new file
            const newPath = Option.match(parent, {
              onNone: () => fileName,
              onSome: (parent) => `${Option.getOrThrow(workspace.pathTo(parent))}/${fileName}`
            })
            yield* fileType === "File"
              ? writeFile(workspace.relativePath(newPath), "", "typescript")
              : mkdir(workspace.relativePath(newPath))
            const node = fileType === "File"
              ? makeFile(fileName, "", true)
              : makeDirectory(fileName, [], true)
            yield* SubscriptionRef.set(workspaceRef, Option.match(parent, {
              onNone: () => workspace.append(node),
              onSome: (parent) => workspace.replaceNode(parent, makeDirectory(
                parent.name,
                [...parent.children, node],
                parent.userManaged
              ))
            }))
            return node
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.annotateLogs({
              service: "WorkspaceHandle",
              method: "createFile"
            })
          )
        }

        /**
         * Renames a file in the workspace.
         */
        function rename(node: File | Directory, newName: string) {
          return Effect.gen(function*() {
            yield* validateFileName(newName, node._tag)
            const workspace = yield* SubscriptionRef.get(workspaceRef)
            const newNode = node._tag === "File"
              ? makeFile(newName, node.initialContent, node.userManaged)
              : makeDirectory(newName, node.children, node.userManaged)
            const newWorkspace = workspace.replaceNode(node, newNode)
            const oldPath = yield* Effect.orDie(workspace.pathTo(node))
            const newPath = yield* Effect.orDie(newWorkspace.pathTo(newNode))
            yield* renameFile(
              workspace.relativePath(oldPath),
              workspace.relativePath(newPath)
            )
            yield* SubscriptionRef.set(workspaceRef, newWorkspace)
            return newNode
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.annotateLogs({
              service: "WorkspaceHandle",
              method: "renameFile"
            })
          )
        }

        /**
         * Removes a file from the workspace.
         */
        function remove(node: File | Directory) {
          return Effect.gen(function*() {
            const workspace = yield* SubscriptionRef.get(workspaceRef)
            const newWorkspace = workspace.removeNode(node)
            const path = yield* Effect.orDie(workspace.pathTo(node))
            yield* removeFile(workspace.relativePath(path))
            yield* SubscriptionRef.set(workspaceRef, newWorkspace)
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.annotateLogs({
              service: "WorkspaceHandle",
              method: "removeFile"
            })
          )
        }

        // Create a subscription ref to track changes to the workspace
        const workspaceRef = yield* SubscriptionRef.make(workspace)
        // Mount the workspace file system into the container
        yield* mountWorkspace(workspace)

        return {
          workspace: workspaceRef,
          spawn: spawnInWorkspace,
          run: runInWorkspace,
          createFile: create,
          renameFile: rename,
          removeFile: remove,
        } as const
      })
    }

    // Install the default executables into the container
    yield* installExe("run", runExe)
    yield* installExe("dev-tools-proxy", devToolsProxyExe)

    // Start the DevTools proxy 
    const devToolsEvents = yield* PubSub.sliding<Request.WithoutPing>(128)
    yield* spawn("./dev-tools-proxy").pipe(
      Effect.tap((process) =>
        Stream.fromReadableStream(() => process.output, identity).pipe(
          Stream.orDie,
          Stream.encodeText,
          Stream.pipeThroughChannel(Ndjson.unpackSchema(Request)({
            ignoreEmptyLines: true
          })),
          Stream.runForEach((event) =>
            event._tag === "Ping" ? Effect.void : devToolsEvents.publish(event)
          )
        )
      ),
      Effect.forever,
      Effect.forkScoped
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
      makeDirectory: mkdir,
      watchFile,
    } as const
  })
}) { }

function treeFromWorkspace(workspace: Workspace): FileSystemTree {
  function walk(children: Workspace["tree"]): FileSystemTree {
    const tree: FileSystemTree = {}
    children.forEach((child) => {
      if (child._tag === "File") {
        tree[child.name] = {
          file: { contents: child.initialContent }
        }
      } else {
        tree[child.name] = {
          directory: walk(child.children)
        }
      }
    })
    return tree
  }
  return walk(workspace.tree)
}

const runExe = `#!/usr/bin/env node
const ChildProcess = require("node:child_process")
const Path = require("node:path")

const outDir = "dist"
const program = process.argv[2]
const programJs = program.replace(/\.ts$/, ".js")
const compiledProgram = Path.join(outDir, Path.basename(programJs))

function run() {
  ChildProcess.spawn("tsc-watch", [
    "--module", "nodenext",
    "--outDir", outDir,
    "--sourceMap", "true",
    "--target", "esnext",
    "--lib", "ES2022,DOM,DOM.Iterable",
    program,
    "--onSuccess", \`node --enable-source-maps \${compiledProgram}\`
  ], {
    stdio: "inherit"
  }).on("exit", function() {
    console.clear()
    run()
  })
}

run()
`

const devToolsProxyExe = `#!/usr/bin/env node
const Net = require("node:net")

const server = Net.createServer((socket) => {
  socket.pipe(process.stdout, { end: false })
})

server.listen(34437)
`
