import { setupTypeAcquisition } from "@typescript/ata"
import { Effect, Layer, Stream, flow } from "effect"
import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { Monaco } from "../Monaco"

const make = Effect.gen(function* () {
  const { monaco, makeEditor, listen } = yield* Monaco

  const ata = setupTypeAcquisition({
    projectName: "Effect Playground",
    typescript: (window as any).ts,
    delegate: {
      // NOTE: Types acquired for a file are cached, so the `receivedFile`
      // delegate will not execute if you comment out an import in the file
      // and then uncomment it
      receivedFile: (code: string, _path: string) => {
        const path = `file://${_path}`
        console.log(`[ATA] Adding ${path} to runtime`, { code })
        monaco.languages.typescript.typescriptDefaults.addExtraLib(code, path)
      },
      started: () => {
        console.log("[ATA]: Beginning automatic type acquisition...")
      },
      errorMessage: (message) => {
        console.error(message)
      },
      finished: () => {
        console.log("[ATA]: Finished automatic type acquisition")
      }
    }
  })

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    strict: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    strictNullChecks: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowSyntheticDefaultImports: true,
    outDir: "lib"
  })

  const install = (editor: monaco.editor.IStandaloneCodeEditor) => {
    function onChange() {
      const model = editor.getModel()
      if (!model) return
      ata(model.getValue())
    }
    onChange()
    return listen(editor.onDidChangeModel).pipe(
      Stream.merge(listen(editor.onDidChangeModelContent)),
      Stream.debounce(1000),
      Stream.runForEach(() => Effect.sync(onChange)),
      Effect.forkScoped,
      Effect.asVoid
    )
  }

  const makeEditorWithATA = flow(
    makeEditor,
    Effect.tap((editor) => install(editor.editor))
  )

  return { makeEditorWithATA } as const
})

export class MonacoATA extends Effect.Tag("app/Monaco/ATA")<
  MonacoATA,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make).pipe(Layer.provideMerge(Monaco.Live))
}
