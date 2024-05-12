import { Workspace } from "@/domain/Workspace"
import {
  FileSystemTree,
  WebContainer as WC,
  WebContainerProcess
} from "@webcontainer/api"
import { Data, Effect, GlobalValue, Layer, Scope, identity } from "effect"
import * as Http from "@effect/platform/HttpClient"

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
        const snapshot = yield* Http.request
          .get(`/snapshots/${workspace.snapshot}`)
          .pipe(Http.client.fetchOk, Http.response.arrayBuffer)

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

      return identity<WorkspaceHandle>({
        write: writeFile,
        read: readFile,
        run,
        shell
      })
    }).pipe(Effect.annotateLogs({ workspace: workspace.name }))

  return { workspace } as const
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

const runProgram = `#!/usr/bin/env node
const CP = require("child_process")

function run() {
  CP.spawn("tsx", ["--watch", ...process.argv.slice(2)], {
    stdio: "inherit"
  }).on("exit", function() {
    console.clear()
    run()
  })
}

run()
`
