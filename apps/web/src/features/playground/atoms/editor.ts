import * as monaco from "@effect/monaco-editor"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { AtomWorkspaceHandle } from "./workspace"
import { FullPath } from "../domain/workspace"
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
        const path = get.once(handle.selectedPath)
        return Option.match(workspace.findFile(path), {
          onNone: () => Effect.void,
          onSome: () => {
            const model = editor.editor.getModel()
            if (model === null) {
              return Effect.void
            }
            const fullPath = FullPath(workspace.relativePath(path))
            handle.modelChanged(fullPath, {
              content: model.getValue(),
              modelVersion: model.getVersionId(),
            })
            return handle.persistModel(fullPath)
          },
        })
      })

      function sync(fullPath: FullPath) {
        return Stream.fromEffect(handle.getModel(fullPath)).pipe(
          Stream.tap((model) => editor.loadModel(model)),
          Stream.switchMap(() => editor.content),
          Stream.tap((model) =>
            Effect.sync(() => handle.modelChanged(fullPath, model)),
          ),
          Stream.debounce("2 seconds"),
          Stream.tap(() => handle.persistModel(fullPath)),
          Stream.ensuring(
            handle
              .persistModel(fullPath)
              .pipe(Effect.catchTag("FileNotFoundError", () => Effect.void)),
          ),
        )
      }

      yield* loader.withIndicator("Configuring editor")(Effect.void)
      yield* get.stream(handle.selectedPath).pipe(
        Stream.mapEffect((path) => {
          const workspace = get.once(handle.workspace)
          return Effect.fromOption(workspace.findFile(path)).pipe(
            Effect.map(() => FullPath(workspace.relativePath(path))),
          )
        }),
        Stream.switchMap(sync),
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
        onSome: () => {
          get.set(handle.selectedPath, workspacePath)
          return true
        },
      })
    },
  })
}
