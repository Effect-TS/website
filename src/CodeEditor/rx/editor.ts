import { themeRx } from "@/rx/theme"
import { MonacoATA } from "@/CodeEditor/services/Monaco/ATA"
import { Rx } from "@effect-rx/rx-react"
import { Data, Effect, Option, Stream } from "effect"
import { WorkspaceHandle, workspaceHandleRx } from "./workspace"

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
      const file = get(selectedFile)
      const path = workspace.pathTo(file)
      if (path._tag === "None") return Effect.void
      return handle.write(path.value, editor.editor.getValue())
    })

    yield* get.stream(selectedFile).pipe(
      Stream.bindTo("file"),
      Stream.bindEffect("path", ({ file }) => workspace.pathTo(file)),
      Stream.bindEffect("content", ({ path }) => handle.read(path)),
      Stream.flatMap(
        ({ file, path, content }) =>
          editor.load(`${workspace.name}/${path}`, file, content).pipe(
            Effect.as(editor.content),
            Stream.unwrap,
            Stream.filter((content) => content !== file.solution),
            Stream.tap(() => get.set(solved, false)),
            Stream.debounce("3 second"),
            Stream.runForEach((content) => handle.write(path, content))
          ),
        { switch: true }
      ),
      Stream.runDrain,
      Effect.forkScoped
    )

    get.subscribe(solved, (solved) => {
      if (!solved) return
      const file = get(selectedFile)
      if (file.solution) {
        editor.editor.setValue(file.solution)
      }
    })

    return { ...editor, save } as const
  })
)
