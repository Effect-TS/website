import { Context, Effect, Layer } from "effect"
<<<<<<< Updated upstream:src/components/editor/services/Monaco/formatters.ts
import { createStreaming, type GlobalConfiguration } from "@dprint/formatter"
import { type MonacoApi } from "../Monaco"

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
=======
import { createStreaming } from "@dprint/formatter"
import { type MonacoApi, Monaco } from "@/components/editor/services/Monaco"
>>>>>>> Stashed changes:src/components/editor/services/monaco/formatters.ts

const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco

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

  function setupTypeScriptFormatter(monaco: MonacoApi) {
    return Effect.gen(function* () {
<<<<<<< Updated upstream:src/components/editor/services/Monaco/formatters.ts
      const formatter = yield* Effect.promise(() =>
        createStreaming(fetch("/vendor/dprint-0.90.5.wasm"))
      )

      formatter.setConfig(globalConfig, typescriptPluginConfig)

      monaco.languages.registerDocumentFormattingEditProvider("typescript", {
        provideDocumentFormattingEdits(model, _options, _token) {
          return [
            {
              text: formatter.formatText(
                model.id.toString(),
                model.getValue()
              ),
              range: model.getFullModelRange()
            }
          ]
        }
      })
=======

>>>>>>> Stashed changes:src/components/editor/services/monaco/formatters.ts
    })
  }

  const install = (monaco: MonacoApi) => {
    // setupCodeActions(monaco)
    return setupTypeScriptFormatter(monaco)
  }

  return { install } as const
})

export class MonacoFormatters extends Context.Tag("app/Monaco/Formatters")<
  MonacoFormatters,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make)
}
