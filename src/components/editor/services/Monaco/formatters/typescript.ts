import { type MonacoApi } from "@/components/editor/services/Monaco"
import { createStreaming } from "@dprint/formatter"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Formatter from "./formatter"

const PositiveInt = Schema.String.pipe(
  Schema.nonEmpty({ message: () => "Please enter a value"}),
  Schema.parseNumber,
  Schema.message(() => "Expected a number"),
  Schema.int({ message: () => "Expected an integer" }),
  Schema.positive({ message: () => "Expected a positive integer" })
)

export const Settings = Schema.Struct({
  lineWidth: PositiveInt,
  indentWidth: PositiveInt,
  operatorPosition: Schema.Literal("maintain", "nextLine", "sameLine"),
  quoteStyle: Schema.Literal(
    "alwaysDouble",
    "alwaysSingle",
    "preferDouble",
    "preferSingle"
  ),
  semiColons: Schema.Literal("always", "asi", "prefer"),
  trailingCommas: Schema.Literal("always", "never", "onlyMultiLine")
})

export type EncodedSettings = Schema.Schema.Encoded<typeof Settings>
export type Settings = Schema.Schema.Type<typeof Settings>

const make = Effect.gen(function* () {
  const language = "typescript" as const

  const defaultSettings: Settings = {
    indentWidth: 2,
    lineWidth: 120,
    operatorPosition: "maintain",
    semiColons: "asi",
    quoteStyle: "alwaysDouble",
    trailingCommas: "never"
  }

  const ref = yield* Ref.make(defaultSettings)

  const formatter = yield* Effect.promise(() =>
    createStreaming(fetch("/vendor/dprint-0.90.5.wasm"))
  )

  const setConfig = (settings: Settings): void =>
    formatter.setConfig(
      {},
      {
        ...settings,
        "arrowFunction.useParentheses": "force"
      }
    )

  setConfig(defaultSettings)

  const install = (monaco: MonacoApi) =>
    Effect.sync(() => {
      monaco.languages.registerDocumentFormattingEditProvider(language, {
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

  return Formatter.make({
    language,
    install,
    schema: Settings,
    getSettings: Ref.get(ref),
    updateSettings: (settings) =>
      Ref.setAndGet(ref, settings).pipe(
        Effect.flatMap((settings) => Effect.sync(() => setConfig(settings)))
      )
  })
})

export class TypeScriptFormatter extends Context.Tag(
  "app/Monaco/Formatters/TypeScript"
)<TypeScriptFormatter, Effect.Effect.Success<typeof make>>() {
  static Live = Layer.effect(this, make)
}
