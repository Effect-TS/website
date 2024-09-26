import { Effect, Layer } from "effect"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import type ts from "typescript"
import { Monaco, type MonacoApi } from "../Monaco"

/** Strongly-typed RegExp groups (https://github.com/microsoft/TypeScript/issues/32098#issuecomment-1279645368) */
type RegExpGroups<T extends string> = IterableIterator<RegExpMatchArray> &
  Array<{ groups: Record<T, string> | Record<string, string> }>

export const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco

  setupTwoslash(monaco)
})

export const MonacoTwoslashLive = Layer.effectDiscard(make).pipe(
  Layer.provide(Monaco.Live)
)
type LineInfo = {
  model: monaco.editor.ITextModel
  position: monaco.Position
  lineLength: number
}
const range = (num: number) => [...Array(num).keys()]

export async function getLeftMostQuickInfoOfLine(
  worker: monaco.languages.typescript.TypeScriptWorker,
  { model, position, lineLength }: LineInfo
) {
  const offset = model.getOffsetAt(position)
  for (const i of range(lineLength)) {
    const quickInfo: ts.QuickInfo | undefined =
      await worker.getQuickInfoAtPosition(
        "file://" + model.uri.path,
        i + offset
      )

    if (!quickInfo || !quickInfo.displayParts) {
      continue
    }

    return quickInfo
  }
}

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

        const matches = text.matchAll(inlineQueryRegex) as RegExpGroups<
          "start" | "end"
        >

        for (const _match of matches) {
          if (_match.index === undefined) {
            break
          }

          if (cancellationToken.isCancellationRequested) {
            return {
              hints: [],
              dispose: () => {}
            }
          }
          const [line] = _match
          const { start, end: querySymbol } = _match.groups

          const offset = 0

          const startIndex = line.indexOf(start)
          const startPos = model.getPositionAt(
            startIndex + offset + _match.index
          )
          const endIndex = line.lastIndexOf(querySymbol) + 2
          const endPos = model.getPositionAt(endIndex + offset + _match.index)

          const quickInfo = await getLeftMostQuickInfoOfLine(worker, {
            model,
            position: startPos,
            lineLength: endIndex - startIndex - 2
          })

          if (!quickInfo || !quickInfo.displayParts) {
            continue
          }
          results.push(
            createHint({
              displayParts: quickInfo.displayParts,
              monaco,
              position: endPos
            })
          )
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

          const quickInfo: ts.QuickInfo | undefined =
            await worker.getQuickInfoAtPosition(
              "file://" + model.uri.path,
              inspectionOff
            )

          if (!quickInfo || !quickInfo.displayParts) {
            continue
          }

          results.push(
            createHint({
              displayParts: quickInfo.displayParts,
              monaco,
              position: endPos
            })
          )
        }
        return {
          hints: results,
          dispose: () => {}
        }
      }
    }
  )
}

function createHint(options: {
  displayParts: ts.SymbolDisplayPart[]
  position: monaco.Position
  monaco: MonacoApi
}): monaco.languages.InlayHint {
  const { displayParts, position, monaco } = options
  let text = displayParts
    .map((d) => d.text)
    .join("")
    .replace(/\\n/g, " ")
    .replace(/\/n/g, " ")
    .replace(/  /g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")

  return {
    kind: monaco.languages.InlayHintKind.Type,
    position: new monaco.Position(position.lineNumber, position.column + 1),
    label: text,
    paddingLeft: true
  }
}
