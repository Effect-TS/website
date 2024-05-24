import { Effect } from "effect/Effect"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"

export interface Formatter {
  readonly language: string
  readonly getConfig: Effect<Formatter.Config>
  setConfig(config: Formatter.Config): Effect<void>
  format(model: monaco.editor.ITextModel): string
}

export declare namespace Formatter {
  export type Config = Record<string, unknown>
}
