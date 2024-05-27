import { Workspace } from "@/workspaces/domain/workspace"
import { Context, Effect, Layer } from "effect"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import type ts from "typescript"
import { Monaco, type MonacoApi } from "../Monaco"

export const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco

  const preload = (_workspace: Workspace) => Effect.sync(() => {
    setupCompletionItemProviders(monaco)
  })

  return { preload } as const
})

export class MonacoCompleters extends Context.Tag("app/Monaco/Completers")<
  MonacoCompleters,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make).pipe(
    Layer.provide(Monaco.Live),
  )
}

function setupCompletionItemProviders(monaco: MonacoApi) {
  const previousRegistrationProvider =
    monaco.languages.registerCompletionItemProvider

  monaco.languages.registerCompletionItemProvider = function (
    language: monaco.languages.LanguageSelector,
    provider: monaco.languages.CompletionItemProvider
  ): monaco.IDisposable {
    // If the model's language is not TypeScript, there is no need to use the
    // custom completion item provider
    if (language !== "typescript") {
      return previousRegistrationProvider(language, provider)
    }

    // Implementation adapted from https://github.com/microsoft/monaco-editor/blob/a845ff6b278c76183a9cf969260fc3e1396b2b0b/src/language/typescript/languageFeatures.ts#L435
    provider.provideCompletionItems = async function (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _context: monaco.languages.CompletionContext,
      _token: monaco.CancellationToken
    ) {
      // Hack required for converting a `ts.TextChange` to a `ts.TextEdit` - see
      // toTextEdit function defined below
      ;(this as any).__model = model

      const wordInfo = model.getWordUntilPosition(position)
      const wordRange = new monaco.Range(
        position.lineNumber,
        wordInfo.startColumn,
        position.lineNumber,
        wordInfo.endColumn
      )
      const resource = model.uri
      const offset = model.getOffsetAt(position)

      const worker = await (this as any)._worker(resource)

      if (model.isDisposed()) {
        return
      }

      const info: ts.CompletionInfo | undefined =
        await worker.getCompletionsAtPosition(resource.toString(), offset)

      if (!info || model.isDisposed()) {
        return
      }

      const suggestions = info.entries.map((entry) => {
        let range = wordRange
        if (entry.replacementSpan) {
          const p1 = model.getPositionAt(entry.replacementSpan.start)
          const p2 = model.getPositionAt(
            entry.replacementSpan.start + entry.replacementSpan.length
          )
          range = new monaco.Range(
            p1.lineNumber,
            p1.column,
            p2.lineNumber,
            p2.column
          )
        }

        const tags: Array<monaco.languages.CompletionItemTag> = []
        if (entry.kindModifiers?.indexOf("deprecated") !== -1) {
          tags.push(monaco.languages.CompletionItemTag.Deprecated)
        }

        return {
          uri: resource,
          position,
          offset,
          range,
          label: entry.name,
          insertText: entry.name,
          sortText: entry.sortText,
          kind: (provider.constructor as any).convertKind(entry.kind),
          tags,
          data: entry.data,
          hasAction: entry.hasAction,
          source: entry.source
        }
      })

      return { suggestions }
    }

    interface CustomCompletionItem extends monaco.languages.CompletionItem {
      readonly label: string
      readonly uri: monaco.Uri
      readonly position: monaco.Position
      readonly offset: number
      readonly data?: ts.CompletionEntryData | undefined
    }

    provider.resolveCompletionItem = async function (
      item: CustomCompletionItem,
      _token: monaco.CancellationToken
    ) {
      const worker = await (this as any)._worker(item.uri)

      const details: ts.CompletionEntryDetails | undefined =
        await worker.getCompletionEntryDetails(
          item.uri.toString(),
          item.offset,
          item.label,
          {},
          item.uri.toString(),
          undefined,
          item.data
        )

      if (!details) {
        return item
      }

      const autoImports = getAutoImports(provider, details)

      return {
        uri: item.uri,
        position: item.position,
        label: details.name,
        kind: (provider.constructor as any).convertKind(details.kind),
        detail:
          autoImports?.detailText ||
          displayPartsToString(details.displayParts),
        additionalTextEdits: autoImports?.textEdits,
        documentation: {
          value: (provider.constructor as any).createDocumentationString(
            details
          )
        }
      } as CustomCompletionItem
    }

    return previousRegistrationProvider(language, provider)
  }
}

function displayPartsToString(
  displayParts: Array<ts.SymbolDisplayPart> | undefined
): string {
  if (displayParts) {
    return displayParts.map((displayPart) => displayPart.text).join("")
  }
  return ""
}

interface AutoImport {
  readonly detailText: string
  readonly textEdits: ReadonlyArray<monaco.languages.TextEdit>
}

function getAutoImports(
  provider: monaco.languages.CompletionItemProvider,
  details: ts.CompletionEntryDetails
): AutoImport | undefined {
  const codeAction = details.codeActions?.[0]
  if (!codeAction) {
    return
  }

  const { textChanges } = codeAction.changes[0]

  // If the newly entered text does not start with `import ...`, then it will be
  // potentially added to an existing import and can most likely be accepted
  // without modification
  if (textChanges.every((textChange) => !/import/.test(textChange.newText))) {
    const specifier = codeAction.description.match(/from ["'](.+)["']/)![1]
    return {
      detailText: `Auto import from '${specifier}'`,
      textEdits: textChanges.map((textChange) =>
        toTextEdit(provider, textChange)
      )
    }
  }

  if (details.kind === "interface" || details.kind === "type") {
    const specifier = codeAction.description.match(
      /from module ["'](.+)["']/
    )![1]
    return {
      detailText: `Auto import from '${specifier}'`,
      textEdits: textChanges.map((textChange) =>
        toTextEdit(provider, {
          ...textChange,
          // Make type-related **new** imports safe since the resolved specifier
          // might be internal and we don't have an easy way to remap it to a
          // more public one that we actually allow when we load the code at
          // runtime. This should work out of the box with `isolatedModules: true`
          // but for some reason it does not
          newText: textChange.newText.replace(/import/, "import type")
        })
      )
    }
  }

  return {
    detailText: codeAction.description,
    textEdits: textChanges.map((textChange: any) =>
      toTextEdit(provider, textChange)
    )
  }
}

function toTextEdit(
  provider: monaco.languages.CompletionItemProvider,
  textChange: ts.TextChange
): monaco.languages.TextEdit {
  return {
    // If there is no existing import in the file then a new import has to be
    // created. In such situations, TypeScript may fail to compute the proper
    // module specifier for this "node_module" because it exits its
    // `tryGetModuleNameAsNodeModule` when it doesn't have fs layer installed:
    // https://github.com/microsoft/TypeScript/blob/328e888a9d0a11952f4ff949848d4336bce91b18/src/compiler/moduleSpecifiers.ts#L553.
    // It then generates a relative path which we just hack around here
    text: textChange.newText,
    range: (provider as any)._textSpanToRange(
      (provider as any).__model,
      textChange.span
    )
  }
}
