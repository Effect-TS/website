import {
  Cache,
  Effect,
  Layer,
  Option,
  pipe,
  Record,
  Sink,
  Stream
} from "effect"
import { createStreaming, type Formatter } from "@dprint/formatter"
import { Toaster } from "@/services/Toaster"
import { WebContainer } from "@/workspaces/services/WebContainer"
import { Monaco } from "../Monaco"

export interface FormatterPlugin {
  readonly language: string
  readonly formatter: Formatter
}

const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco
  const { toast } = yield* Toaster
  const { registerPlugin } = yield* WebContainer

  yield* Effect.sync(() => {
    monaco.editor.addEditorAction({
      id: "format",
      label: "Format",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: (editor) => {
        const action = editor.getAction("editor.action.formatDocument")
        if (action) {
          action.run()
        }
      }
    })
  })

  const formatters = new Map<string, Formatter>()

  const pluginCache = yield* Cache.make({
    capacity: 10,
    timeToLive: Number.MAX_SAFE_INTEGER,
    lookup: (plugin: string) => loadPlugin(plugin)
  })

  const LANGUAGE_REGEX =
    /^\/vendor\/dprint\/plugins\/([a-zA-Z0-9_-]+)-.*\.wasm$/

  function extractLanguage(input: string) {
    const match = input.match(LANGUAGE_REGEX)
    return match ? match[1] : null
  }

  function loadPlugin(plugin: string): Effect.Effect<FormatterPlugin> {
    return Effect.all({
      language: Effect.fromNullable(extractLanguage(plugin)),
      formatter: Effect.promise(() => createStreaming(fetch(plugin)))
    }).pipe(Effect.orDie)
  }

  function loadPlugins(plugins: Array<string>) {
    return Effect.forEach(plugins, (plugin) => pluginCache.get(plugin), {
      concurrency: plugins.length
    })
  }

  function installPlugins(plugins: Array<FormatterPlugin>) {
    return Effect.forEach(
      plugins,
      ({ language, formatter }) =>
        Effect.sync(() => {
          monaco.languages.registerDocumentFormattingEditProvider(language, {
            provideDocumentFormattingEdits(model) {
              return [
                {
                  text: formatter.formatText(
                    model.uri.toString(),
                    model.getValue()
                  ),
                  range: model.getFullModelRange()
                }
              ]
            }
          })
        }),
      { concurrency: plugins.length, discard: true }
    )
  }

  function setLanguageConfig(language: string, config: any) {
    const formatter = formatters.get(language)
    if (formatter) {
      formatter.setConfig({}, config)
    }
  }

  const parseJson = Option.liftThrowable(JSON.parse)

  function configurePlugin(config: string) {
    return parseJson(config).pipe(
      Effect.flatMap((json) =>
        Effect.sync(() => {
          const { plugins, ...rest } = json
          return Record.toEntries(rest).forEach(([language, config]) => {
            setLanguageConfig(language, config)
          })
        })
      ),
      Effect.ignore
    )
  }

  yield* registerPlugin((handle) =>
    Effect.gen(function* () {
      const workspace = yield* handle.workspace.get
      const config = workspace.findFile("dprint.json")
      if (Option.isNone(config)) {
        return
      }

      yield* parseJson(config.value[0].initialContent).pipe(
        Effect.flatMap((json) => loadPlugins(json.plugins as Array<string>)),
        Effect.tap((plugins) => installPlugins(plugins)),
        Effect.map((plugins) =>
          plugins.forEach(({ language, formatter }) => {
            formatters.set(language, formatter)
          })
        ),
        Effect.ignore
      )

      const [initial, updates] = yield* pipe(
        handle.watch("dprint.json"),
        Stream.peel(Sink.head())
      )
      if (Option.isNone(initial)) {
        return
      }

      // Perform initial plugin configuration
      yield* configurePlugin(initial.value)

      // Handle updates to plugin configuration
      yield* pipe(
        updates,
        Stream.tap(() =>
          toast({
            title: "Effect Playground",
            description: "Updated formatter settings!"
          })
        ),
        Stream.runForEach(configurePlugin),
        Effect.forkScoped
      )
    }).pipe(
      Effect.ignoreLogged,
      Effect.annotateLogs("service", "MonacoFormatters")
    )
  )
}).pipe(
  Effect.withSpan("MonacoFormatters.make"),
  Effect.annotateLogs("service", "MonacoFormatters")
)

export const MonacoFormattersLive = Layer.scopedDiscard(make).pipe(
  Layer.provide(Monaco.Live),
  Layer.provide(Toaster.Live),
  Layer.provide(WebContainer.Live)
)
