import { themeRx } from "@/rx/theme"
import { MonacoATA } from "@/CodeEditor/services/Monaco/ATA"
import { Rx } from "@effect-rx/rx-react"
import { Data, Effect, Option, Stream } from "effect"
import { WorkspaceHandle, workspaceHandleRx } from "./workspace"
import { File } from "@/domain/Workspace"

const runtime = Rx.runtime(MonacoATA.Live).pipe(Rx.setIdleTTL("30 seconds"))

export class EditorContext extends Data.Class<{
  readonly el: HTMLElement
  readonly workspace: WorkspaceHandle
}> {}

export const editorThemeRx = Rx.map(themeRx, (theme) =>
  theme === "dark" ? "vs-dark" : "vs"
)

export const editorElementRx = Rx.make(Option.none<HTMLElement>())

export const editorRx = runtime.rx((get) =>
  Effect.gen(function* (_) {
    const el = yield* get.some(editorElementRx)
    const { workspace, handle, selectedFile, solved } =
      yield* get.result(workspaceHandleRx)
    const monaco = yield* MonacoATA
    const editor = yield* monaco.makeEditorWithATA(el)

    get.subscribe(
      editorThemeRx,
      (theme) => editor.editor.updateOptions({ theme }),
      { immediate: true }
    )

    const save = Effect.suspend(() => {
      const file = get.once(selectedFile)
      const path = workspace.pathTo(file)
      if (path._tag === "None") return Effect.void
      return handle.write(path.value, editor.editor.getValue())
    })

    const sync = (path: string, file: File) =>
      content(path, file).pipe(
        Stream.tap((content) => editor.load(path, file, content)),
        Stream.flatMap((_) => editor.content, { switch: true }),
        Stream.debounce("3 second"),
        Stream.tap((content) => handle.write(path, content)),
        Stream.ensuring(
          Effect.suspend(() => handle.write(path, editor.editor.getValue()))
        )
      )
    const content = (path: string, file: File) =>
      handle.read(path).pipe(Stream.concat(solvedContent(file)))
    const solvedContent = (file: File) =>
      get.stream(solved).pipe(
        Stream.drop(1),
        Stream.map((solved) =>
          solved ? file.solution ?? file.initialContent : file.initialContent
        )
      )

    yield* get.stream(selectedFile).pipe(
      Stream.bindTo("file"),
      Stream.bindEffect("path", ({ file }) => workspace.pathTo(file)),
      Stream.flatMap(({ file, path }) => sync(path, file), { switch: true }),
      Stream.runDrain,
      Effect.catchAllCause(Effect.log),
      Effect.forkScoped
    )

    return { ...editor, save } as const
  })
)
