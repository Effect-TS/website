import * as monaco from "@effect/monaco-editor"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { AtomWorkspaceHandle } from "./workspace"
import { File, FullPath } from "../domain/workspace"
import { Loader } from "../services/loader"
import { Monaco } from "../services/monaco"
import { Toaster } from "../services/toaster"
import { themeAtom } from "./theme"

export const editorThemeAtom = themeAtom.pipe(
  Atom.map((theme) => (theme === "dark" ? "dracula" : "chrome-devtools")),
)

const runtime = Atom.runtime(
  Layer.mergeAll(Loader.layer, Monaco.layer, Toaster.layer),
).pipe(Atom.setIdleTTL("10 seconds"))

export const editorAtom = Atom.family((handle: AtomWorkspaceHandle) => {
  const element = Atom.make(Option.none<HTMLElement>())

  const editor = runtime.atom(
    Effect.fnUntraced(function* (get) {
      const loader = yield* Loader
      const { createEditor } = yield* Monaco

      const el = yield* get.some(element)
      const editor = yield* createEditor(el)

      get.subscribe(
        editorThemeAtom,
        (theme) => editor.editor.updateOptions({ theme }),
        {
          immediate: true,
        },
      )

      setupGoToDefinition(handle, get)

      const save = Effect.suspend(() => {
        const workspace = get.once(handle.workspaceAtom)
        const file = get.once(handle.selectedFile)
        const path = workspace.fullPathTo(file)
        return Option.match(path, {
          onNone: () => Effect.void,
          onSome: (path) =>
            handle.writeFile(path, editor.editor.getValue(), "typescript"),
        })
      })

      function sync(fullPath: FullPath, file: File) {
        return Stream.fromEffect(handle.readFile(fullPath)).pipe(
          Stream.tap((model) => editor.loadModel(model)),
          Stream.switchMap(() => editor.content.pipe(Stream.drop(1))),
          Stream.debounce("2 seconds"),
          Stream.tap((content) =>
            handle.writeFile(fullPath, content, file.language ?? "typescript"),
          ),
          Stream.ensuring(
            Effect.suspend(() => {
              const content = editor.editor.getValue()
              if (content.trim().length === 0) {
                return Effect.void
              }
              return handle
                .writeFile(fullPath, content, file.language ?? "typescript")
                .pipe(Effect.catchTag("FileNotFoundError", () => Effect.void))
            }),
          ),
        )
      }

      yield* loader.withIndicator("Configuring editor")(Effect.void)
      yield* get.stream(handle.selectedFile).pipe(
        Stream.bindTo("file"),
        Stream.bindEffect("fullPath", ({ file }) =>
          Effect.fromOption(get.once(handle.workspace).fullPathTo(file)),
        ),
        Stream.switchMap(({ file, fullPath }) => sync(fullPath, file)),
        Stream.runDrain,
        Effect.retry(Schedule.spaced("200 millis")),
        Effect.forkScoped,
      )

      yield* loader.finish

      return {
        ...editor,
        save,
      } as const
    }),
  )

  return {
    element,
    editor,
  } as const
})

function setupGoToDefinition(
  handle: AtomWorkspaceHandle,
  get: Atom.AtomContext,
) {
  monaco.editor.registerEditorOpener({
    openCodeEditor(editor, uri) {
      const model = monaco.editor.getModel(uri)
      if (model === null) {
        return false
      }
      const workspace = get.once(handle.workspaceAtom)
      const fullPath = model.uri.fsPath
      const workspacePath = fullPath
        .replace(workspace.name, "")
        .replace(/^\/+/, "")
      return Option.match(workspace.findFile(workspacePath), {
        onNone: () => {
          editor.trigger(
            "registerEditorOpener",
            "editor.action.peekDefinition",
            {},
          )
          return false
        },
        onSome: ([file]) => {
          get.set(handle.selectedFile, file)
          return true
        },
      })
    },
  })
}
