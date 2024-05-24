import { type MonacoApi } from "@/components/editor/services/Monaco"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"

export interface Formatter<Language extends string, Settings extends Schema.Schema.All> {
  readonly language: Language
  readonly schema: Settings
  readonly install: (monaco: MonacoApi) => Effect.Effect<void>
  readonly getSettings: Effect.Effect<Schema.Schema.Type<Settings>>
  readonly updateSettings: (
    settings: Schema.Schema.Type<Settings>
  ) => Effect.Effect<void>
}

export const make = <Language extends string, Settings extends Schema.Schema.All>(
  options: Formatter<Language, Settings>
): Formatter<Language, Settings> => options
