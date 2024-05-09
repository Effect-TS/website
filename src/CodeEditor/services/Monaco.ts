import { File } from "@/domain/Workspace"
import { Data, Effect, GlobalValue, Layer, Stream } from "effect"
import * as monaco from "monaco-editor/esm/vs/editor/editor.api"

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

const make = Effect.gen(function* (_) {
  const monaco = yield* loadApi

  const makeEditor = (
    el: HTMLElement,
    options?: {
      readonly theme?: string
    }
  ) =>
    Effect.gen(function* (_) {
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
      if (options?.theme) {
        monaco.editor.setTheme(options.theme)
      }

      const viewStates = new Map<
        string,
        monaco.editor.ICodeEditorViewState | null
      >()
      const load = (path: string, file: File) =>
        Effect.gen(function* () {
          const uri = monaco.Uri.parse(path)
          const model =
            monaco.editor.getModel(uri) ||
            monaco.editor.createModel(file.initialContent, file.language, uri)
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

      const content = Stream.async<string>((emit) => {
        const cancel = editor.onDidChangeModelContent((e) => {
          emit.single(editor.getValue())
        })
        emit.single(editor.getValue())
        return Effect.sync(() => cancel.dispose())
      })

      return { editor, load, content } as const
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