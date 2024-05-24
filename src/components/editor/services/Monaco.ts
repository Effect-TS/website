import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as GlobalValue from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { File, FullPath, Workspace } from "@/workspaces/domain/workspace"
import { MonacoFormatters } from "./Monaco/formatters"
import { MonacoCompleters } from "./Monaco/completers"

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
  const completers = yield* MonacoCompleters
  const formatters = yield* MonacoFormatters

  completers.install(monaco)
  yield* formatters.install(monaco)

  monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
    customWorkerPath: `${new URL(window.location.origin)}vendor/ts.worker.js`
  })

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    strict: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    strictNullChecks: true
  })

  const makeEditor = (el: HTMLElement) =>
    Effect.gen(function* () {
      const editor = yield* Effect.acquireRelease(
        Effect.sync(() =>
          monaco.editor.create(el, {
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 16
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
          const uri = monaco.Uri.parse(path)
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
        Effect.forEach(
          workspace.filePaths,
          ([file, path]) =>
            Effect.sync(() => {
              const uri = monaco.Uri.parse(`${workspace.name}/${path}`)
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

      return { editor, load, preload, content, theme } as const
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
  static Live = Layer.scoped(this, make).pipe(
    Layer.provide(MonacoCompleters.Live),
    Layer.provide(MonacoFormatters.Live)
  )
}
