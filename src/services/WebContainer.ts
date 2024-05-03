import {
  FileSystemTree,
  WebContainer as WC,
  WebContainerProcess
} from "@webcontainer/api"
import {
  Context,
  Data,
  Effect,
  Equal,
  Hash,
  Layer,
  Array,
  Scope,
  ScopedCache,
  identity,
  pipe
} from "effect"

const make = Effect.gen(function* (_) {
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
            container.mount(workspace.tree, { mountPoint: workspace.name })
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

      const writeFile = (file: string, data: string) =>
        Effect.promise(() => container.fs.writeFile(path(file), data))

      return identity<WorkspaceHandle>({
        write: writeFile,
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

export class WebContainer extends Context.Tag("WebContainer")<
  WebContainer,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make)
}

export class WebContainerError extends Data.TaggedError("WebContainerError")<{
  readonly message: string
}> {}

export class Workspace extends Data.Class<{
  name: string
  files: Array<FileWithContent>
  filesOfInterest: Array<FileWithContent>
}> {
  copyWith(name: string, files: Array<FileWithContent>) {
    return new Workspace({
      name,
      files: this.files.concat(files),
      filesOfInterest: files
    })
  }
  get tree() {
    return Array.reduce(
      this.files,
      <FileSystemTree>{},
      (tree, file) => {
        tree[file.file] = { file: { contents: file.initialContent } }
        return tree
      }
    )
  }
  [Hash.symbol]() {
    return Hash.string(this.name)
  }
  [Equal.symbol](that: this) {
    return this.name === that.name
  }
}

export interface WorkspaceHandle {
  readonly write: (file: string, data: string) => Effect.Effect<void>
  readonly shell: Effect.Effect<WebContainerProcess, never, Scope.Scope>
}

export class FileWithContent extends Data.Class<{
  file: string
  initialContent: string
}> {
  [Hash.symbol]() {
    return pipe(Hash.string(this.file), Hash.cached(this))
  }
  [Equal.symbol](that: this) {
    return this.file === that.file
  }
}
