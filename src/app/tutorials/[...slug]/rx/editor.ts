import { MonacoATA } from "@/app/tutorials/[...slug]/services/Monaco/ATA"
import { Rx } from "@effect-rx/rx-react"
import { Data, Effect, Stream } from "effect"
import { WorkspaceHandle, selectedFileRx } from "./workspace"

const runtime = Rx.runtime(MonacoATA.Live).pipe(Rx.setIdleTTL("30 seconds"))

export class EditorContext extends Data.Class<{
  readonly el: HTMLElement
  readonly workspace: WorkspaceHandle
}> {}

export const editorRx = runtime.fn(({ el, workspace }: EditorContext, get) =>
  Effect.gen(function* () {
    const monaco = yield* MonacoATA
    const editor = yield* monaco.makeEditorWithATA(el, {
      initialFile: workspace.workspace.initialFile
    })
    yield* get.stream(selectedFileRx).pipe(
      Stream.map((i) => workspace.workspace.filesOfInterest[i]),
      Stream.flatMap(
        (file) =>
          editor.content.pipe(
            Stream.debounce("1 second"),
            Stream.runForEach((content) =>
              workspace.handle.write(file.file, content)
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

export interface EditorHandle extends Rx.Rx.InferSuccess<typeof editorRx> {}
