import { Data, Effect, GlobalValue, Layer, Stream, pipe } from "effect"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { File, FullPath, Workspace } from "@/workspaces/domain/workspace"

export type MonacoApi = typeof monaco

export class MonacoError extends Data.TaggedError("MonacoError")<{
  readonly reason: "LoadApi"
  readonly message: string
}> {
  constructor(reason: MonacoError["reason"], message: string) {
    super({ reason, message: `${reason}: ${message}` })
  }
}

const loadApi = GlobalValue.globalValue("app/Monaco/loadApi", () =>
  Effect.async<MonacoApi, MonacoError>((resume) => {
    const script = document.createElement("script")
    script.src = "/vendor/vs.loader.js"
    script.async = true
    script.onload = () => {
      const require = globalThis.require as any

      require.config({
        paths: {
          vs: "/vendor/vs"
        },
        // This is something you need for monaco to work
        ignoreDuplicateModules: ["vs/editor/editor.main"]
      })

      require(["vs/editor/editor.main", "vs/language/typescript/tsWorker"], (
        monaco: MonacoApi,
        _tsWorker: any
      ) => {
        const isOK = monaco && (window as any).ts
        if (!isOK) {
          resume(
            new MonacoError(
              "LoadApi",
              "Unable to setup all playground dependencies!"
            )
          )
        } else {
          resume(Effect.succeed(monaco))
        }
      })
    }
    document.body.appendChild(script)
  }).pipe(Effect.cached, Effect.runSync)
)

const make = Effect.gen(function* () {
  const monaco = yield* loadApi

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

  monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
    customWorkerPath: `${new URL(window.location.origin)}vendor/ts.worker.js`
  })

  const makeEditor = (el: HTMLElement) =>
    Effect.gen(function* () {
      const editor = yield* Effect.acquireRelease(
        Effect.sync(() =>
          monaco.editor.create(el, {
            automaticLayout: true,
            fixedOverflowWidgets: true,
            fontSize: 16,
            minimap: { enabled: false },
            quickSuggestions: {
              comments: false,
              other: true,
              strings: true
            }
          })
        ),
        (editor) => Effect.sync(() => editor.dispose())
      ).pipe(
        Effect.tapErrorCause(Effect.log),
        Effect.withSpan("acquire editor")
      )

      const theme = (theme: string) =>
        Effect.sync(() => monaco.editor.setTheme(theme))

      const viewStates = new Map<
        string,
        monaco.editor.ICodeEditorViewState | null
      >()
      const load = (path: FullPath, file: File, content: string) =>
        Effect.gen(function* () {
          const uri = monaco.Uri.file(path)
          const model =
            monaco.editor.getModel(uri) ||
            monaco.editor.createModel(content, file.language, uri)
          model.setValue(content)
          const current = editor.getModel()
          if (current && current === model) {
            return model
          }
          if (current) {
            viewStates.set(path, editor.saveViewState())
          }
          editor.setModel(model)
          if (viewStates.has(path)) {
            editor.restoreViewState(viewStates.get(path)!)
          }
          return model
        })

      const preload = (workspace: Workspace) =>
        // Ensure that all workspace file paths are loaded to avoid type
        // errors on initial load when importing from other files
        Effect.forEach(
          workspace.filePaths,
          ([file, path]) =>
            Effect.sync(() => {
              if (file._tag === "Directory") return
              const uri = monaco.Uri.file(`${workspace.name}/${path}`)
              if (monaco.editor.getModel(uri)) {
                return
              }
              monaco.editor.createModel(
                file.initialContent,
                file.language,
                uri
              )
            }),
          { discard: true }
        )

      const content = Stream.async<string>((emit) => {
        const cancel = editor.onDidChangeModelContent(() => {
          emit.single(editor.getValue())
        })
        return Effect.sync(() => cancel.dispose())
      })

      const refresh = () => {
        const currentModel = editor.getModel()
        if (currentModel) {
          currentModel.setValue(currentModel.getValue())
        }
      }

      const renameFile = (node: File, oldPath: FullPath, newPath: FullPath) =>
        pipe(
          Effect.fromNullable(
            monaco.editor.getModel(monaco.Uri.file(oldPath))
          ),
          Effect.map((model) => model.getValue()),
          Effect.zipLeft(removeFile(oldPath)),
          Effect.andThen((content) => {
            monaco.editor.createModel(
              content,
              node.language,
              monaco.Uri.file(newPath)
            )
            refresh()
          }),
          Effect.ignore
        )

      const removeFile = (path: FullPath) =>
        Effect.sync(() => {
          const uri = monaco.Uri.file(path)
          const model = monaco.editor.getModel(uri)
          if (model) {
            model.dispose()
            refresh()
          }
        })

      return {
        editor,
        load,
        preload,
        content,
        renameFile,
        removeFile,
        theme
      } as const
    })

  function listen<A>(event: monaco.IEvent<A>) {
    return Stream.async<A>((emit) => {
      const disposable = event(function (a) {
        emit.single(a)
      })
      return Effect.sync(() => {
        disposable.dispose()
      })
    })
  }

  return { monaco, makeEditor, listen } as const
}).pipe(
  Effect.withSpan("Monaco.make"),
  Effect.annotateLogs("service", "Monaco")
)

export class Monaco extends Effect.Tag("app/Monaco")<
  Monaco,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make)
}
