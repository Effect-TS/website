import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { Monaco } from "@/components/editor/services/Monaco"
import { Formatter } from "./formatters/formatter"
import { TypeScriptFormatter } from "./formatters/typescript"

const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco

  const formatters = [yield* TypeScriptFormatter]

  function getConfig(language: string): Effect.Effect<Formatter.Config> {
    return pipe(
      formatters,
      Array.findFirst((formatter) => formatter.language === language),
      Effect.flatMap((formatter) => formatter.getConfig),
      Effect.orDie
    )
  }

  function setConfig(language: string, config: Formatter.Config) {
    return pipe(
      formatters,
      Array.findFirst((formatter) => formatter.language === language),
      Effect.flatMap((formatter) => formatter.setConfig(config)),
      Effect.orDie
    )
  }

  function registerFormatters(formatters: ReadonlyArray<Formatter>) {
    for (const formatter of formatters) {
      monaco.languages.registerDocumentFormattingEditProvider(
        formatter.language,
        {
          provideDocumentFormattingEdits(model) {
            return [
              {
                text: formatter.format(model),
                range: model.getFullModelRange()
              }
            ]
          }
        }
      )
    }
  }

  // Setup the format document code action to be triggered with CtrlCmd+S
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

  registerFormatters(formatters)

  return { getConfig, setConfig } as const
})

export class MonacoFormatters extends Context.Tag("app/Monaco/Formatters")<
  MonacoFormatters,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make).pipe(
    Layer.provide(TypeScriptFormatter.Live),
    Layer.provide(Monaco.Live)
  )
}
