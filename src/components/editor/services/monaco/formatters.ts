import { Context, Effect, Layer } from "effect"
import { createStreaming, type GlobalConfiguration } from "@dprint/formatter"
import { type MonacoApi } from "../monaco"

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

const make = Effect.gen(function* () {
  function setupCodeActions(monaco: MonacoApi) {
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
  }

  function setupTypeScriptFormatter(monaco: MonacoApi) {
    return Effect.gen(function* () {
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
    })
  }

  const install = (monaco: MonacoApi) => {
    setupCodeActions(monaco)
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
