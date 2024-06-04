import * as Http from "@effect/platform/HttpClient"
import {
  FileSystemTree,
  WebContainer as WC,
  WebContainerProcess
} from "@webcontainer/api"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as GlobalValue from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import { Workspace } from "../domain/workspace"
import * as Stream from "effect/Stream"

const semaphore = GlobalValue.globalValue("app/WebContainer/semaphore", () =>
  Effect.unsafeMakeSemaphore(1)
)

const make = Effect.gen(function* () {
  // you can only have one container running at a time
  yield* Effect.acquireRelease(semaphore.take(1), () => semaphore.release(1))

  const container = yield* Effect.acquireRelease(
    Effect.promise(() => WC.boot()),
    (_) => Effect.sync(() => _.teardown())
  )

  const activeWorkspaces = new Set<WorkspaceHandle>()
  const workspaceScopes = new WeakMap<WorkspaceHandle, Scope.Scope>()
  const plugins = new Set<WorkspacePlugin>()

  yield* Effect.promise(async () => {
    await container.fs.writeFile("run", runProgram)
    await container.spawn("chmod", ["+x", "run"])
  })

  const workspace = (workspace: Workspace) =>
    Effect.gen(function* () {
      const path = (_: string) => `${workspace.name}/${_}`

      yield* Effect.acquireRelease(
        Effect.promise(async () => {
          await container.fs.rm(workspace.name, {
            recursive: true,
            force: true
          })
          return container.fs.mkdir(workspace.name)
        }),
        () =>
          Effect.andThen(
            Effect.log("removing"),
            Effect.promise(() =>
              container.fs.rm(workspace.name, {
                recursive: true,
                force: true
              })
            )
          )
      )

      if (workspace.snapshot) {
        const snapshot = yield* pipe(
          Http.request.get(`/snapshots/${workspace.snapshot}`),
          Http.client.fetchOk,
          Http.response.arrayBuffer
        )
        yield* Effect.promise(async () => {
          await container.mount(snapshot, {
            mountPoint: workspace.name
          })
        })
      }

      yield* Effect.promise(() =>
        container.mount(treeFromWorkspace(workspace), {
          mountPoint: workspace.name
        })
      )

      const shell = Effect.acquireRelease(
        Effect.promise(() =>
          container.spawn("jsh", [], {
            env: {
              PATH: "node_modules/.bin:/usr/local/bin:/usr/bin:/bin",
              NODE_NO_WARNINGS: "1"
            }
          })
        ),
        (process) => Effect.sync(() => process.kill())
      )
      const run = (command: string) =>
        Effect.acquireUseRelease(
          Effect.promise(() =>
            container.spawn(
              "jsh",
              ["-c", `cd ${workspace.name} && ${command}`],
              {
                env: {
                  PATH: "node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
                }
              }
            )
          ),
          (process) => Effect.promise(() => process.exit),
          (process) => Effect.sync(() => process.kill())
        )

      const writeFile = (file: string, data: string) =>
        Effect.promise(() => container.fs.writeFile(path(file), data))

      const readFile = (file: string) =>
        Effect.promise(() => container.fs.readFile(path(file))).pipe(
          Effect.map((_) => new TextDecoder().decode(_))
        )
      const makeDirectory = (directory: string) =>
        Effect.promise(() => container.fs.mkdir(path(directory)))

      const watchFile = (file: string) => {
        const changes = Stream.async<void>((emit) => {
          const watcher = container.fs.watch(path(file), (_event) => {
            emit.single(void 0)
          })
          return Effect.sync(() => watcher.close())
        }).pipe(Stream.mapEffect(() => readFile(file)))
        return readFile(file).pipe(Stream.concat(changes), Stream.changes)
      }

      const handle = identity<WorkspaceHandle>({
        workspace,
        write: writeFile,
        read: readFile,
        watch: watchFile,
        mkdir: makeDirectory,
        run,
        shell
      })

      activeWorkspaces.add(handle)
      const scope = yield* Effect.scope

      workspaceScopes.set(handle, scope)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => activeWorkspaces.delete(handle))
      )

      yield* Effect.forEach(plugins, (plugin) => plugin(handle), {
        discard: true
      })

      return handle
    }).pipe(Effect.annotateLogs({ workspace: workspace.name }))

  const registerPlugin = (plugin: WorkspacePlugin) =>
    Effect.suspend(() => {
      plugins.add(plugin)
      return Effect.forEach(
        activeWorkspaces,
        (handle) =>
          plugin(handle).pipe(Scope.extend(workspaceScopes.get(handle)!)),
        { discard: true }
      )
    }).pipe(
      Effect.interruptible,
      Effect.acquireRelease(() =>
        Effect.sync(() => {
          plugins.delete(plugin)
        })
      ),
      Effect.asVoid
    )

  return { workspace, registerPlugin } as const
}).pipe(
  Effect.annotateLogs({
    service: "WebContainer"
  })
)

export class WebContainer extends Effect.Tag("WebContainer")<
  WebContainer,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make)
}

export class WebContainerError extends Data.TaggedError("WebContainerError")<{
  readonly message: string
}> {}

export interface WorkspaceHandle {
  readonly workspace: Workspace
  readonly write: (file: string, data: string) => Effect.Effect<void>
  readonly read: (file: string) => Effect.Effect<string>
  readonly mkdir: (directory: string) => Effect.Effect<void>
  readonly watch: (file: string) => Stream.Stream<string>
  readonly shell: Effect.Effect<WebContainerProcess, never, Scope.Scope>
  readonly run: (command: string) => Effect.Effect<number>
}

export interface WorkspacePlugin {
  (handle: WorkspaceHandle): Effect.Effect<void, never, Scope.Scope>
}

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

const runProgram = `#!/usr/bin/env node
const CP = require("child_process")

const program = process.argv[2]
const programJs = program.replace(/\.ts$/, ".js")

function run() {
  CP.spawn("tsc-watch", ["-m", "nodenext", "-t", "esnext", program, "--onSuccess", \`node \${programJs}\`], {
    stdio: "inherit"
  }).on("exit", function() {
    console.clear()
    run()
  })
}

run()
`
