import { Atom } from "@effect-atom/atom-react"
import * as monaco from "@effect/monaco-editor"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import { themeAtom } from "@/atoms/theme"
import { Toaster } from "@/services/toaster"
import { File, FullPath } from "../domain/workspace"
import { Loader } from "../services/loader"
import { Monaco } from "../services/monaco"
import { WebContainer } from "../services/webcontainer"
import type { AtomWorkspaceHandle } from "./workspace"

export const editorThemeAtom = Atom.map(themeAtom, (theme) => (theme === "dark" ? "dracula" : "vs"))

const runtime = Atom.runtime(
  Layer.mergeAll(Loader.Default, Monaco.Default, Toaster.Default, WebContainer.Default)
).pipe(Atom.setIdleTTL("10 seconds"))
export const editorAtom = Atom.family((handle: AtomWorkspaceHandle) => {
  const element = Atom.make(Option.none<HTMLElement>())

  const editor = runtime.atom(
    Effect.fnUntraced(function* (get) {
      const loader = yield* Loader
      const { createEditor } = yield* Monaco
      const container = yield* WebContainer

      const el = yield* get.some(element)
      const editor = yield* createEditor(el)

      /**
       * Syncs the website theme with the editor.
       */
      get.subscribe(editorThemeAtom, (theme) => editor.editor.updateOptions({ theme }), { immediate: true })

      /**
       * Setup go-to-definition for the playground
       */
      setupGoToDefinition(handle, get)

      /**
       * Saves the content of the editor's current model to the file system.
       */
      const save = Effect.suspend(() => {
        const workspace = get.once(handle.workspaceAtom)
        const file = get.once(handle.selectedFile)
        const path = workspace.fullPathTo(file)
        return Option.match(path, {
          onNone: () => Effect.void,
          onSome: (path) => container.writeFile(path, editor.editor.getValue(), "typescript")
        })
      })

      /**
       * Syncs the content of the editor with the underlying WebContainer file
       * system.
       */
      function sync(fullPath: FullPath, file: File) {
        return container.readFile(fullPath).pipe(
          Stream.tap((model) => editor.loadModel(model)),
          Stream.flatMap(() => editor.content.pipe(Stream.drop(1)), {
            switch: true
          }),
          Stream.debounce("2 seconds"),
          Stream.tap((content) => container.writeFile(fullPath, content, file.language)),
          Stream.ensuring(
            Effect.suspend(() => {
              const content = editor.editor.getValue()
              if (content.trim().length === 0) {
                return Effect.void
              }
              return container.writeFile(fullPath, content, file.language)
            })
          )
        )
      }

      // Ensure the editor UI reflects changes to the selected workspace file
      yield* loader.withIndicator("Configuring editor")(Effect.void)
      yield* get.stream(handle.selectedFile).pipe(
        Stream.bindTo("file"),
        Stream.bindEffect("fullPath", ({ file }) => get.once(handle.workspace).fullPathTo(file)),
        Stream.flatMap(({ file, fullPath }) => sync(fullPath, file), {
          switch: true
        }),
        Stream.runDrain,
        Effect.retry(Schedule.spaced("200 millis")),
        Effect.forkScoped
      )

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

function setupGoToDefinition(handle: AtomWorkspaceHandle, get: Atom.Context) {
  monaco.editor.registerEditorOpener({
    openCodeEditor(editor, uri) {
      const model = monaco.editor.getModel(uri)
      if (model === null) {
        return false
      }
      const workspace = get.once(handle.workspaceAtom)
      const fullPath = model.uri.fsPath
      const workspacePath = fullPath.replace(workspace.name, "").replace(/^\/+/, "")
      return Option.match(workspace.findFile(workspacePath), {
        onNone: () => {
          editor.trigger("registerEditorOpener", "editor.action.peekDefinition", {})
          return false
        },
        onSome: ([file]) => {
          get.set(handle.selectedFile, file)
          return true
        }
      })
    }
  })
}
