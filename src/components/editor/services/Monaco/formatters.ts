import { Cache, Context, Effect, Layer, Option } from "effect"
import {
  createStreaming,
  type Formatter,
  type GlobalConfiguration
} from "@dprint/formatter"
import { Monaco } from "../Monaco"
import { Workspace } from "@/workspaces/domain/workspace"

const globalConfig: GlobalConfiguration = {
  indentWidth: 2,
  lineWidth: 120
}

const typescriptPluginConfig = {
  semiColons: "asi",
  quoteStyle: "alwaysDouble",
  trailingCommas: "never",
  operatorPosition: "maintain",
  "arrowFunction.useParentheses": "force"
}

export interface FormatterPlugin {
  readonly language: string
  readonly plugin: Formatter
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
      plugin: Effect.promise(() => createStreaming(fetch(plugin)))
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
      ({ language, plugin }) =>
        Effect.sync(() => {
          monaco.languages.registerDocumentFormattingEditProvider(language, {
            provideDocumentFormattingEdits(model) {
              return [
                {
                  text: plugin.formatText(model.id, model.getValue()),
                  range: model.getFullModelRange()
                }
              ]
            }
          })
        }),
      { concurrency: plugins.length, discard: true }
    )
  }

  function preload(workspace: Workspace) {
    const parse = Option.liftThrowable(JSON.parse)
    return workspace.findFile("dprint.json").pipe(
      Effect.flatMap(([file]) => parse(file.initialContent)),
      Effect.flatMap((json) => loadPlugins(json.plugins as Array<string>)),
      Effect.flatMap((plugins) => installPlugins(plugins)),
      Effect.orDie
    )
  }

  return { preload } as const
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
