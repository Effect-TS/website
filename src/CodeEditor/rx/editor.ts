import { MonacoATA } from "@/CodeEditor/services/Monaco/ATA"
import { File, Workspace } from "@/domain/Workspace"
import { themeRx } from "@/rx/theme"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Option, Stream } from "effect"
import { workspaceHandleRx } from "./workspace"

const runtime = Rx.runtime(MonacoATA.Live).pipe(Rx.setIdleTTL("30 seconds"))

export const editorThemeRx = Rx.map(themeRx, (theme) =>
  theme === "dark" ? "vs-dark" : "vs"
)

export const editorRx = Rx.family((workspace: Workspace) => {
  const element = Rx.make(Option.none<HTMLElement>()).pipe(
    Rx.debounce("500 millis")
  )
  const editor = runtime.rx((get) =>
    Effect.gen(function* (_) {
      const { handle, solved, selectedFile } = yield* get.result(
        workspaceHandleRx(workspace)
      )
      const el = yield* get.some(element)
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
          Stream.flatMap((_) => editor.content.pipe(Stream.drop(1)), {
            switch: true
          }),
          Stream.debounce("3 second"),
          Stream.tap((content) => handle.write(path, content)),
          Stream.ensuring(
            Effect.suspend(() => {
              const content = editor.editor.getValue()
              if (!content.trim()) return Effect.void
              return handle.write(path, content)
            })
          )
        )
      const content = (path: string, file: File) =>
        handle.read(path).pipe(Stream.concat(solvedContent(file)))
      const solvedContent = (file: File) =>
        get.stream(solved).pipe(
          Stream.drop(1),
          Stream.map((solved) =>
            solved
              ? file.solution ?? file.initialContent
              : file.initialContent
          )
        )

      yield* get.stream(selectedFile).pipe(
        Stream.bindTo("file"),
        Stream.bindEffect("path", ({ file }) => workspace.pathTo(file)),
        Stream.flatMap(({ file, path }) => sync(path, file), {
          switch: true
        }),
        Stream.runDrain,
        Effect.catchAllCause(Effect.log),
        Effect.forkScoped
      )

      return { ...editor, save } as const
    })
  )

  return { element, editor } as const
})
