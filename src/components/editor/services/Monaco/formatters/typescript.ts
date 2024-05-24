import { createStreaming } from "@dprint/formatter"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import { Formatter } from "./formatter"

const PositiveInt = Schema.String.pipe(
  Schema.nonEmpty({ message: () => "Please enter a value" }),
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
  const storageKey = `playground:${language}:formatter:config`
  const defaultConfig: Formatter.Config = {
    indentWidth: 2,
    lineWidth: 120,
    operatorPosition: "maintain",
    semiColons: "asi",
    quoteStyle: "alwaysDouble",
    trailingCommas: "never"
  }

  const loadConfig = Effect.suspend(() =>
    Effect.fromNullable(localStorage.getItem(storageKey))
  )
  const saveConfig = (config: Formatter.Config) =>
    Effect.sync(() =>
      localStorage.setItem(storageKey, JSON.stringify(config))
    )

  const initialConfig = yield* loadConfig.pipe(
    Effect.flatMap(Effect.fromNullable),
    Effect.map((serialized) => JSON.parse(serialized) as Formatter.Config),
    Effect.catchTag("NoSuchElementException", () =>
      saveConfig(defaultConfig).pipe(Effect.as(defaultConfig))
    )
  )

  const ref = yield* Ref.make<Formatter.Config>(initialConfig)

  const formatter = yield* Effect.promise(() =>
    createStreaming(fetch("/vendor/dprint-0.90.5.wasm"))
  )

  return identity<Formatter>({
    language,
    getConfig: Ref.get(ref),
    setConfig: (config) =>
      Ref.set(ref, config).pipe(Effect.zipLeft(saveConfig(config))),
    format: (model) => formatter.formatText(model.id, model.getValue())
  })
})

export class TypeScriptFormatter extends Context.Tag(
  "app/Monaco/Formatters/TypeScript"
)<TypeScriptFormatter, Effect.Effect.Success<typeof make>>() {
  static Live = Layer.effect(this, make)
}
