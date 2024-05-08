import { themeRx } from "@/rx/theme"
import { MonacoATA } from "@/services/Monaco/ATA"
import { Rx } from "@effect-rx/rx-react"
import { Data, Effect, Option, Stream } from "effect"
import { WorkspaceHandle } from "./workspace"

const runtime = Rx.runtime(MonacoATA.Live).pipe(Rx.setIdleTTL("30 seconds"))

export class EditorContext extends Data.Class<{
  readonly el: HTMLElement
  readonly workspace: WorkspaceHandle
}> {}

export const editorThemeRx = Rx.map(themeRx, (theme) =>
  theme === "dark" ? "vs-dark" : "vs"
)

export const editorRx = Rx.family((workspace: WorkspaceHandle) => {
  const element = Rx.make<HTMLElement | null>(null)
  const editor = runtime.rx((get) =>
    Effect.gen(function* (_) {
      const el = yield* _(Option.fromNullable(get(element)))
      const monaco = yield* MonacoATA
      console.log(workspace.workspace)
      const editor = yield* monaco.makeEditorWithATA(el, {
        initialFile: workspace.workspace.initialFile
      })
      yield* get.stream(editorThemeRx).pipe(
        Stream.runForEach((theme) =>
          Effect.sync(() => editor.editor.updateOptions({ theme }))
        ),
        Effect.forkScoped
      )
      yield* get.stream(workspace.selectedFile).pipe(
        Stream.bindTo("file"),
        Stream.bindEffect("path", ({ file }) =>
          workspace.workspace.pathTo(file)
        ),
        Stream.flatMap(
          ({ file, path }) =>
            editor.load(`${workspace.workspace.name}/${path}`, file).pipe(
              Effect.as(editor.content),
              Stream.unwrap,
              Stream.debounce("1 second"),
              Stream.runForEach((content) =>
                workspace.handle.write(path, content)
              )
            ),
          { switch: true }
        ),
        Stream.runDrain,
        Effect.forkScoped
      )
      return editor
    })
  )

  return { element, editor } as const
})
