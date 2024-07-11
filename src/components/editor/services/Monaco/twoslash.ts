import { Effect, Layer } from "effect"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import type ts from "typescript"
import { Monaco, type MonacoApi } from "../Monaco"

export const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco

  setupTwoslash(monaco)
})

export const MonacoTwoslashLive = Layer.effectDiscard(make).pipe(
  Layer.provide(Monaco.Live)
)

function setupTwoslash(monaco: MonacoApi) {
  monaco.languages.registerInlayHintsProvider(
    [
      { language: "javascript" },
      { language: "typescript" },
      { language: "typescriptreact" },
      { language: "javascriptreact" }
    ],
    {
      displayName: "twoslash",
      provideInlayHints: async (model, _, cancellationToken) => {
        const text = model.getValue()
        const queryRegex = /^\s*\/\/\.?\s*\^\?/gm
        const inlineQueryRegex =
          /^[^\S\r\n]*(?<start>\S).*\/\/\s*(?<end>=>)/gm
        const results: Array<monaco.languages.InlayHint> = []

        const worker = await monaco.languages.typescript
          .getTypeScriptWorker()
          .then((worker) => worker(model.uri))

        if (model.isDisposed()) {
          return {
            hints: [],
            dispose: () => {}
          }
        }
        let match

        while ((match = queryRegex.exec(text)) !== null) {
          const end = match.index + match[0].length - 1
          const endPos = model.getPositionAt(end)
          const inspectionPos = new monaco.Position(
            endPos.lineNumber - 1,
            endPos.column
          )
          const inspectionOff = model.getOffsetAt(inspectionPos)

          if (cancellationToken.isCancellationRequested) {
            return {
              hints: [],
              dispose: () => {}
            }
          }

          const hint: ts.QuickInfo | undefined =
            await worker.getQuickInfoAtPosition(
              "file://" + model.uri.path,
              inspectionOff
            )

          if (!hint || !hint.displayParts) {
            continue
          }

          // Make a one-liner
          let text = hint.displayParts
            .map((d) => d.text)
            .join("")
            .replace(/\\n/g, " ")
            .replace(/\/n/g, " ")
            .replace(/  /g, " ")
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")

          const inlay: monaco.languages.InlayHint = {
            kind: monaco.languages.InlayHintKind.Type,
            position: new monaco.Position(
              endPos.lineNumber,
              endPos.column + 1
            ),
            label: text,
            paddingLeft: true
          }
          results.push(inlay)
        }
        return {
          hints: results,
          dispose: () => {}
        }
      }
    }
  )
}
