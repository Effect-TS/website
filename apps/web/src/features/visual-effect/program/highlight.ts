import { Array, Data, Effect, Schema } from "effect"
import type { ThemedToken } from "shiki/types"
import type { SnippetLanguage } from "../model/snippet-highlights"
import { getSnippetTokens } from "../runtime/shiki-singleton"

/** A token with its look as CSS properties, so the view only has to print it. */
export const StyledToken = Schema.Struct({
  content: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  style: Schema.Record(Schema.String, Schema.String),
})
export type StyledToken = typeof StyledToken.Type

export const StyledLines = Schema.Array(Schema.Array(StyledToken))
export type StyledLines = typeof StyledLines.Type

export const Highlighted = Schema.Struct({
  source: Schema.String,
  lines: StyledLines,
})
export type Highlighted = typeof Highlighted.Type

const ITALIC = 1
const BOLD = 2
const UNDERLINE = 4

const styleOf = (token: ThemedToken): Record<string, string> => ({
  ...token.htmlStyle,
  ...(token.color === undefined ? {} : { color: token.color }),
  ...(token.bgColor === undefined ? {} : { "background-color": token.bgColor }),
  ...(token.fontStyle !== undefined && (token.fontStyle & ITALIC) !== 0
    ? { "font-style": "italic" }
    : {}),
  ...(token.fontStyle !== undefined && (token.fontStyle & BOLD) !== 0
    ? { "font-weight": "700" }
    : {}),
  ...(token.fontStyle !== undefined && (token.fontStyle & UNDERLINE) !== 0
    ? { "text-decoration-line": "underline" }
    : {}),
})

export const toStyledLines = (
  lines: ReadonlyArray<ReadonlyArray<ThemedToken>>,
): StyledLines =>
  Array.map(lines, (line) =>
    Array.map(line, (token) => ({
      content: token.content,
      start: token.offset,
      end: token.offset + token.content.length,
      style: styleOf(token),
    })),
  )

export class HighlightError extends Data.TaggedError("HighlightError")<{
  readonly message: string
}> {}

export const highlight = (
  language: SnippetLanguage,
  source: string,
): Effect.Effect<Highlighted, HighlightError> =>
  Effect.tryPromise({
    try: () => getSnippetTokens(language, source),
    catch: (error) =>
      new HighlightError({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load syntax highlighting",
      }),
  }).pipe(Effect.map((lines) => ({ source, lines: toStyledLines(lines) })))
