import { Rx } from "@effect-rx/rx-react"
import * as monaco from "@effect/monaco-editor"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { themeRx } from "@/rx/theme"
import { Toaster } from "@/services/toaster"
import { File, FullPath } from "../domain/workspace"
import { Loader } from "../services/loader"
import { Monaco } from "../services/monaco"
import { WebContainer } from "../services/webcontainer"
import type { RxWorkspaceHandle } from "./workspace"

export const editorThemeRx = Rx.map(themeRx, (theme) =>
  theme === "dark" ? "dracula" : "vs"
)

const runtime = Rx.runtime(Layer.mergeAll(
  Loader.Default,
  Monaco.Default,
  Toaster.Default,
  WebContainer.Default
)).pipe(Rx.setIdleTTL("10 seconds"))

export const editorRx = Rx.family((handle: RxWorkspaceHandle) => {
  const element = Rx.make(Option.none<HTMLElement>())

  const editor = runtime.rx((get) =>
    Effect.gen(function*() {
      const loader = yield* Loader
      const { createEditor } = yield* Monaco
      const container = yield* WebContainer

      const el = yield* get.some(element)
      const editor = yield* createEditor(el)

      /**
       * Syncs the website theme with the editor.
       */
      get.subscribe(
        editorThemeRx,
        (theme) => editor.editor.updateOptions({ theme }),
        { immediate: true }
      )

      /**
       * Saves the content of the editor's current model to the file system.
       */
      const save = SubscriptionRef.get(handle.workspace).pipe(
        Effect.flatMap((workspace) => {
          const file = get.once(handle.selectedFile)
          const path = workspace.fullPathTo(file)
          return Option.match(path, {
            onNone: () => Effect.void,
            onSome: (path) => container.writeFile(path, editor.editor.getValue(), "typescript")
          })
        })
      )

      /**
       * Syncs the content of the editor with the underlying WebContainer file
       * system.
       */
      function sync(fullPath: FullPath, file: File) {
        return container.readFile(fullPath).pipe(
          Stream.tap((model) => editor.loadModel(model)),
          Stream.flatMap(() => editor.content.pipe(Stream.drop(1)), { switch: true }),
          Stream.debounce("2 seconds"),
          Stream.tap((content) => container.writeFile(fullPath, content, file.language)),
          Stream.ensuring(Effect.suspend(() => {
            const content = editor.editor.getValue()
            if (content.trim().length === 0) {
              return Effect.void
            }
            return container.writeFile(fullPath, content, file.language)
          }))
        )
      }

      // Ensure the editor UI reflects changes to the selected workspace file
      yield* loader.withIndicator("Configuring editor", "1 seconds")(Effect.void)
      yield* get.stream(handle.selectedFile).pipe(
        Stream.bindTo("file"),
        Stream.bindEffect("workspace", () => SubscriptionRef.get(handle.workspace)),
        Stream.bindEffect("fullPath", ({ file, workspace }) => workspace.fullPathTo(file)),
        Stream.flatMap(({ file, fullPath }) => sync(fullPath, file), { switch: true }),
        Stream.runDrain,
        Effect.retry(Schedule.spaced("200 millis")),
        Effect.forkScoped
      )

      // Setup go-to-definition for the playground
      monaco.editor.registerEditorOpener({
        openCodeEditor(_, uri, position) {
          const model = monaco.editor.getModel(uri)
          if (model === null) {
            return false
          }
          return SubscriptionRef.get(handle.workspace).pipe(
            Effect.flatMap((workspace) => {
              const fullPath = model.uri.fsPath
              const workspacePath = fullPath.replace(workspace.name, "").replace(/^\/+/, "")
              return workspace.findFile(workspacePath)
            }),
            Effect.flatMap(([file]) =>
              editor.loadModel(model).pipe(
                Effect.zipRight(
                  Effect.sync(() => {
                    if (position !== undefined) {
                      if ("lineNumber" in position) {
                        editor.editor.revealLineInCenter(position.lineNumber)
                      } else {
                        editor.editor.revealLineInCenter(position.startLineNumber)
                      }
                    }
                  })
                ),
                Effect.zipRight(get.set(handle.selectedFile, file)),
              )
            ),
            Effect.as(true),
            Effect.catchTag("NoSuchElementException", () => {
              editor.editor.trigger("registerEditorOpener", "editor.action.peekDefinition", {})
              return Effect.succeed(false)
            }),
            Effect.runPromise
          )
        }
      })

      yield* loader.finish

      return {
        ...editor,
        save
      } as const
    })
  )

  return {
    element,
    editor
  } as const
})

