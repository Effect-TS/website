import { Workspace } from "@/domain/Workspace"
import {
  FileSystemTree,
  WebContainer as WC,
  WebContainerProcess
} from "@webcontainer/api"
import {
  Data,
  Effect,
  GlobalValue,
  Layer,
  Scope,
  ScopedCache,
  identity
} from "effect"

const semaphore = GlobalValue.globalValue("app/WebContainer/semaphore", () =>
  Effect.unsafeMakeSemaphore(1)
)

const make = Effect.gen(function* (_) {
  // you can only have one container running at a time
  yield* _(
    Effect.acquireRelease(semaphore.take(1), () => semaphore.release(1))
  )

  const container = yield* _(
    Effect.acquireRelease(
      Effect.promise(() => WC.boot()),
      (_) => Effect.sync(() => _.teardown())
    )
  )
  const makeWorkspace = (workspace: Workspace) =>
    Effect.gen(function* (_) {
      const path = (_: string) => `${workspace.name}/${_}`

      yield* _(
        Effect.tryPromise(() => container.fs.mkdir(workspace.name)),
        Effect.ignore
      )

      yield* _(
        Effect.acquireRelease(
          Effect.promise(() =>
            container.mount(treeFromWorkspace(workspace), {
              mountPoint: workspace.name
            })
          ),
          () =>
            Effect.promise(() =>
              container.fs.rm(workspace.name, { recursive: true })
            )
        )
      )

      const shell = Effect.acquireRelease(
        Effect.promise(() =>
          container.spawn("jsh", [], {
            env: {
              PATH: "node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
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

      return identity<WorkspaceHandle>({
        write: writeFile,
        read: readFile,
        run,
        shell
      })
    })

  const cache = yield* _(
    ScopedCache.make({
      lookup: makeWorkspace,
      capacity: 100,
      timeToLive: "1 minutes"
    })
  )

  return { workspace: (_: Workspace) => cache.get(_) } as const
})

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
  readonly write: (file: string, data: string) => Effect.Effect<void>
  readonly read: (file: string) => Effect.Effect<string>
  readonly shell: Effect.Effect<WebContainerProcess, never, Scope.Scope>
  readonly run: (command: string) => Effect.Effect<number>
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
