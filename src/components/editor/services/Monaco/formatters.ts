import { Cache, Context, Effect, Layer, Option, Record, pipe } from "effect"
import { createStreaming, type Formatter } from "@dprint/formatter"
import { Workspace } from "@/workspaces/domain/workspace"
import { Monaco } from "../Monaco"

export interface FormatterPlugin {
  readonly language: string
  readonly formatter: Formatter
}

const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco

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
                  text: formatter.formatText(model.id, model.getValue()),
                  range: model.getFullModelRange()
                }
              ]
            }
          })
        }),
      { concurrency: plugins.length, discard: true }
    )
  }

  function installConfig(language: string, config: any) {
    const formatter = formatters.get(language)
    if (formatter) {
      formatter.setConfig({}, config)
    }
  }

  function preload(workspace: Workspace) {
    const parse = Option.liftThrowable(JSON.parse)
    return workspace.findFile("dprint.json").pipe(
      Effect.flatMap(([file]) => parse(file.initialContent)),
      Effect.flatMap((json) => loadPlugins(json.plugins as Array<string>)),
      Effect.tap((plugins) => installPlugins(plugins)),
      Effect.map((plugins) =>
        plugins.forEach(({ language, formatter }) => {
          formatters.set(language, formatter)
        })
      ),
      Effect.orDie
    )
  }

  function configure(workspace: Workspace) {
    const parse = Option.liftThrowable(JSON.parse)
    return workspace.findFile("dprint.json").pipe(
      Effect.flatMap(([file]) => parse(file.initialContent)),
      Effect.flatMap((json) =>
        Effect.sync(() => {
          const { plugins, ...rest } = json
          return Record.toEntries(rest).forEach(([language, config]) => {
            installConfig(language, config)
          })
        })
      )
    )
  }

  return { configure, preload } as const
}).pipe(
  Effect.withSpan("MonacoFormatters.make"),
  Effect.annotateLogs("service", "MonacoFormatters")
)

export class MonacoFormatters extends Context.Tag("app/Monaco/Formatters")<
  MonacoFormatters,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make).pipe(Layer.provideMerge(Monaco.Live))
}
