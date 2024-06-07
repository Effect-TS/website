import { themeRx } from "@/rx/theme"
import { Rx } from "@effect-rx/rx-react"
import { File, FullPath } from "@/workspaces/domain/workspace"
import { MonacoATA } from "./services/Monaco/ata"
import { WorkspaceHandle } from "@/workspaces/rx"
import { MonacoFormattersLive } from "./services/Monaco/formatters"
import { MonacoCompletersLive } from "./services/Monaco/completers"
import { MonacoTSConfigLive } from "./services/Monaco/tsconfig"
import { Effect, Option, Layer, Schedule, Stream, pipe } from "effect"

const MonacoWithPlugins = MonacoATA.Live.pipe(
  Layer.provide(MonacoCompletersLive),
  Layer.provide(MonacoFormattersLive),
  Layer.provide(MonacoTSConfigLive)
)

const runtime = Rx.runtime(MonacoWithPlugins).pipe(
  Rx.setIdleTTL("10 seconds")
)

export const editorThemeRx = Rx.map(themeRx, (theme) =>
  theme === "dark" ? "vs-dark" : "vs"
)

export const editorRx = Rx.family(
  ({ handle, solved, selectedFile, workspace }: WorkspaceHandle) => {
    const element = Rx.make(Option.none<HTMLElement>())
    const editor = runtime.rx((get) =>
      Effect.gen(function* (_) {
        const el = yield* get.some(element)
        const monaco = yield* MonacoATA
        yield* Effect.acquireRelease(Effect.log("building"), () =>
          Effect.log("releasing")
        )
        const editor = yield* monaco.makeEditorWithATA(el)

        yield* editor.preload(get.once(workspace))

        get.subscribe(
          editorThemeRx,
          (theme) => editor.editor.updateOptions({ theme }),
          { immediate: true }
        )

        const prevContent = new Map<string, string>()
        const write = (path: string, content: string) =>
          Effect.gen(function* (_) {
            const prev = prevContent.get(path)
            if (prev === content) return
            prevContent.set(path, content)
            yield* handle.write(path, content)
          })

        const save = Effect.flatMap(handle.workspace.get, (workspace) => {
          const file = get.once(selectedFile)
          const path = workspace.pathTo(file)
          if (path._tag === "None") return Effect.void
          return write(path.value, editor.editor.getValue())
        })

        const sync = (fullPath: FullPath, path: string, file: File) =>
          content(path, file).pipe(
            Stream.tap((content) => {
              prevContent.set(path, content)
              return editor.load(fullPath, file, content)
            }),
            Stream.flatMap((_) => editor.content.pipe(Stream.drop(1)), {
              switch: true
            }),
            Stream.debounce("2 seconds"),
            Stream.tap((content) => write(path, content)),
            Stream.ensuring(
              Effect.suspend(() => {
                const content = editor.editor.getValue()
                if (!content.trim()) return Effect.void
                return write(path, content)
              })
            )
          )
        const content = (path: string, file: File) =>
          handle.read(path).pipe(
            // Prevent issues when attempting to select newly created files before
            // the file has been written to the container file system
            Effect.retry({
              schedule: Schedule.spaced(100),
              while: (error) => error._tag === "FileNotFoundError",
              times: 5
            }),
            Stream.concat(solvedContent(file))
          )
        const solvedContent = (file: File) =>
          pipe(
            get.stream(solved, { withoutInitialValue: true }),
            Stream.map((solved) =>
              solved
                ? file.solution ?? file.initialContent
                : file.initialContent
            )
          )

        yield* get.stream(selectedFile).pipe(
          Stream.bindTo("file"),
          Stream.bindEffect("workspace", () => handle.workspace.get),
          Stream.bindEffect("path", ({ file, workspace }) =>
            workspace.pathTo(file)
          ),
          Stream.bindEffect("fullPath", ({ file, workspace }) =>
            workspace.fullPathTo(file)
          ),
          Stream.flatMap(
            ({ file, path, fullPath }) => sync(fullPath, path, file),
            { switch: true }
          ),
          Stream.runDrain,
          Effect.retry(Schedule.spaced(200)),
          Effect.forkScoped
        )

        return { ...editor, save } as const
      }).pipe(Effect.annotateLogs("rx", "editorRx"))
    )

    return { element, editor } as const
  }
)
