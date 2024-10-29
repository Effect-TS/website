import * as monaco from "@effect/monaco-editor"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type ts from "typescript"
import { ChromeDevTools, Dracula } from "./monaco/themes"

type MonacoApi = typeof import("@effect/monaco-editor")

export class Monaco extends Effect.Service<Monaco>()("app/Monaco", {
  scoped: Effect.gen(function*() {
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      exactOptionalPropertyTypes: true,
      module: 199 as any, // ts.ModuleKind.NodeNext
      moduleResolution: 99 as any, // ts.ModuleResolutionKind.ESNext
      strict: true,
      target: 99 // ts.ScriptTarget.ESNext
    })

    monaco.editor.defineTheme("chrome-devtools", ChromeDevTools)
    monaco.editor.defineTheme("dracula", Dracula)

    setupCompletionItemProviders(monaco)
    setupTwoslashIntegration(monaco)

    /**
     * Creates a new Monaco editor and attaches it to the specified HTML 
     * element.
     *
     * The editor will be disposed when the associated scope is closed.
     */
    function createEditor(element: HTMLElement) {
      return Effect.gen(function*() {
        const viewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>()

        /**
         * The editor that was created.
         */
        const editor = yield* Effect.acquireRelease(
          Effect.sync(() =>
            monaco.editor.create(element, {
              automaticLayout: true,
              fixedOverflowWidgets: true,
              fontSize: 16,
              minimap: { enabled: false },
              quickSuggestions: {
                comments: false,
                other: true,
                strings: true
              }
            })
          ),
          (editor) => Effect.sync(() => editor.dispose())
        )

        /**
         * Loads the specified model into the editor.
         */
        function loadModel(model: monaco.editor.ITextModel) {
          return Effect.sync(() => {
            const current = editor.getModel()
            // If the current model matches the model to load, there is no further 
            // work to do and we can return the model directly
            if (current !== null && current === model) {
              return model
            }
            // Otherwise, handle the editor view state
            const fsPath = model.uri.fsPath
            if (current !== null) {
              // Make sure to save the view state for the outgoing model
              viewStates.set(fsPath, editor.saveViewState())
            }
            editor.setModel(model)
            if (viewStates.has(fsPath)) {
              // Make sure to restore the view state for the incoming model
              editor.restoreViewState(viewStates.get(fsPath)!)
            }
            return model
          })
        }

        /**
         * A stream of changes made to the content of the editor's currently 
         * loaded model.
         */
        const content = Stream.async<string>((emit) => {
          const disposable = editor.onDidChangeModelContent(() => {
            emit.single(editor.getValue())
          })
          return Effect.sync(() => disposable.dispose())
        })

        return {
          editor,
          loadModel,
          content
        } as const
      })
    }

    return {
      createEditor
    } as const
  })
}) { }

function setupCompletionItemProviders(monaco: MonacoApi) {
  const previousRegistrationProvider =
    monaco.languages.registerCompletionItemProvider

  monaco.languages.registerCompletionItemProvider = function(
    language: monaco.languages.LanguageSelector,
    provider: monaco.languages.CompletionItemProvider
  ): monaco.IDisposable {
    // If the model's language is not TypeScript, there is no need to use the
    // custom completion item provider
    if (language !== "typescript") {
      return previousRegistrationProvider(language, provider)
    }

    // Implementation adapted from https://github.com/microsoft/monaco-editor/blob/a845ff6b278c76183a9cf969260fc3e1396b2b0b/src/language/typescript/languageFeatures.ts#L435
    async function provideCompletionItems(
      this: monaco.languages.CompletionItemProvider,
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _context: monaco.languages.CompletionContext,
      _token: monaco.CancellationToken
    ) {
      // Hack required for converting a `ts.TextChange` to a `ts.TextEdit` - see
      // toTextEdit function defined below
      ; (this as any).__model = model

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
        await worker.getCompletionsAtPosition(resource.toString(), offset, {})

      if (!info || model.isDisposed()) {
        return
      }

      const suggestions = info.entries
        .filter(pruneNodeBuiltIns)
        .map((entry) => {
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
            kind: (this.constructor as any).convertKind(entry.kind),
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
      readonly source: string | undefined
      readonly data?: ts.CompletionEntryData | undefined
    }

    async function resolveCompletionItem(
      this: monaco.languages.CompletionItemProvider,
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
          item.source,
          {},
          item.data
        )

      if (!details) {
        return item
      }

      const autoImports = getAutoImports(this, details)

      return {
        uri: item.uri,
        position: item.position,
        label: details.name,
        kind: (this.constructor as any).convertKind(details.kind),
        detail:
          autoImports?.detailText ||
          displayPartsToString(details.displayParts),
        additionalTextEdits: autoImports?.textEdits,
        documentation: {
          value: (this.constructor as any).createDocumentationString(details)
        }
      } as CustomCompletionItem
    }

    return previousRegistrationProvider(language, {
      triggerCharacters: [".", '"', "'", "`", "/", "@", "<", "#", " "],
      provideCompletionItems: provideCompletionItems.bind(provider),
      resolveCompletionItem: resolveCompletionItem.bind(provider)
    })
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

  const textChanges = codeAction.changes[0]?.textChanges ?? []

  // If the newly entered text does not start with `import ...`, then it will be
  // potentially added to an existing import and can most likely be accepted
  // without modification
  if (textChanges.every((textChange: any) => !/import/.test(textChange.newText))) {
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

// in node repl:
// > require("module").builtinModules
const builtInNodeModules = [
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "readline/promises",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
]

function pruneNodeBuiltIns(entry: ts.CompletionEntry): boolean {
  return !builtInNodeModules.includes(entry.name)
}

/** Strongly-typed RegExp groups (https://github.com/microsoft/TypeScript/issues/32098#issuecomment-1279645368) */
type RegExpGroups<T extends string> = IterableIterator<RegExpMatchArray> &
  Array<{ groups: Record<T, string> | Record<string, string> }>

interface LineInfo {
  readonly model: monaco.editor.ITextModel
  readonly position: monaco.Position
  readonly lineLength: number
}

function setupTwoslashIntegration(monaco: MonacoApi) {
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
            dispose: () => { }
          }
        }

        const matches = text.matchAll(inlineQueryRegex) as unknown as RegExpGroups<"start" | "end">

        for (const _match of matches) {
          if (_match.index === undefined) {
            break
          }

          if (cancellationToken.isCancellationRequested) {
            return {
              hints: [],
              dispose: () => { }
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
              dispose: () => { }
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
          dispose: () => { }
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

const range = (num: number) => [...Array(num).keys()]

async function getLeftMostQuickInfoOfLine(
  worker: monaco.languages.typescript.TypeScriptWorker,
  { model, position, lineLength }: LineInfo
): Promise<ts.QuickInfo | undefined> {
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

  return Promise.resolve(undefined)
}
