import * as Data from "effect/Data"
import * as Schema from "effect/Schema"

export type SnippetLanguage = "typescript" | "javascript"

export interface CodeSnippet {
  readonly language: SnippetLanguage
  readonly source: string
  readonly highlightsByTarget: Readonly<
    Record<string, ReadonlyArray<ResolvedOffsetRange>>
  >
}

export interface CodeSnippetConfig {
  readonly language: SnippetLanguage
  readonly source: string
}

export interface ResolvedOffsetRange {
  readonly startOffset: number
  readonly endOffset: number
}

export const resolveExampleCodeSnippet = (input: {
  readonly code: CodeSnippetConfig
  readonly selectorsByTarget: Readonly<
    Record<string, ReadonlyArray<HighlightSelector>>
  >
  readonly exampleLabel: string
}): CodeSnippet => {
  const normalizedCodeSource = normalizeSnippetSource(input.code.source)
  const highlightsByTarget = resolveAllSelectors({
    source: normalizedCodeSource,
    selectorsByTarget: input.selectorsByTarget,
    exampleLabel: input.exampleLabel,
  })
  const language = validateSnippetLanguage(input.code.language, {
    exampleLabel: input.exampleLabel,
  })

  return {
    language,
    source: normalizedCodeSource,
    highlightsByTarget,
  }
}

export type HighlightSelector = Data.TaggedEnum<{
  readonly Text: {
    readonly text: string
    readonly occurrence?: number
  }
  readonly LineRange: {
    readonly startLine: number
    readonly endLine: number
  }
  readonly OffsetRange: {
    readonly startOffset: number
    readonly endOffset: number
  }
}>
export const HighlightSelector = Data.taggedEnum<HighlightSelector>()

export const snippetResultTargetKey = "result"

export const toStepSnippetTargetKey = (stepId: string): string =>
  `step:${stepId}`

export class CodeSnippetHighlightResolutionError extends Schema.TaggedError<CodeSnippetHighlightResolutionError>()(
  "CodeSnippetHighlightResolutionError",
  {
    exampleLabel: Schema.String,
    targetKey: Schema.String,
    selector: Schema.String,
    reason: Schema.Union([
      Schema.Literal("NoMatch"),
      Schema.Literal("AmbiguousMatch"),
      Schema.Literal("InvalidRange"),
    ]),
    matches: Schema.optional(Schema.Number),
  },
) {}

export class EmptyHighlightSelectorsError extends Schema.TaggedError<EmptyHighlightSelectorsError>()(
  "EmptyHighlightSelectorsError",
  {
    exampleLabel: Schema.String,
    targetKey: Schema.String,
  },
) {}

export class InvalidCodeSnippetLanguageError extends Schema.TaggedError<InvalidCodeSnippetLanguageError>()(
  "InvalidCodeSnippetLanguageError",
  {
    exampleLabel: Schema.String,
    language: Schema.String,
  },
) {}

export const normalizeSnippetSource = (source: string): string => {
  let normalized = source

  if (normalized.startsWith("\n")) {
    normalized = normalized.slice(1)
  }

  if (normalized.endsWith("\n")) {
    normalized = normalized.slice(0, -1)
  }

  return normalized
}

export const validateSnippetLanguage = (
  language: string,
  options: {
    readonly exampleLabel: string
  },
): SnippetLanguage => {
  if (language === "typescript" || language === "javascript") {
    return language
  }

  throw new InvalidCodeSnippetLanguageError({
    exampleLabel: options.exampleLabel,
    language,
  })
}

export const normalizeSelectorInput = (
  selectors: HighlightSelector | ReadonlyArray<HighlightSelector>,
  options: {
    readonly exampleLabel: string
    readonly targetKey: string
  },
): ReadonlyArray<HighlightSelector> => {
  const normalizedSelectors = Array.isArray(selectors)
    ? Array.from(selectors)
    : [selectors]

  if (normalizedSelectors.length === 0) {
    throw new EmptyHighlightSelectorsError({
      exampleLabel: options.exampleLabel,
      targetKey: options.targetKey,
    })
  }

  return normalizedSelectors
}

export const resolveAllSelectors = (input: {
  readonly source: string
  readonly selectorsByTarget: Readonly<
    Record<string, ReadonlyArray<HighlightSelector>>
  >
  readonly exampleLabel: string
}): Readonly<Record<string, ReadonlyArray<ResolvedOffsetRange>>> => {
  const highlightsByTarget: Record<
    string,
    ReadonlyArray<ResolvedOffsetRange>
  > = {}

  for (const targetKey of Object.keys(input.selectorsByTarget)) {
    const selectors = input.selectorsByTarget[targetKey]

    if (!selectors) {
      continue
    }

    if (selectors.length === 0) {
      throw new EmptyHighlightSelectorsError({
        exampleLabel: input.exampleLabel,
        targetKey,
      })
    }

    const ranges = selectors.map((selector) =>
      resolveSelector({
        source: input.source,
        selector,
        exampleLabel: input.exampleLabel,
        targetKey,
      }),
    )

    highlightsByTarget[targetKey] = mergeRanges(ranges)
  }

  return highlightsByTarget
}

const resolveSelector = (input: {
  readonly source: string
  readonly selector: HighlightSelector
  readonly exampleLabel: string
  readonly targetKey: string
}): ResolvedOffsetRange => {
  switch (input.selector._tag) {
    case "Text": {
      const matches = findTextMatches(input.source, input.selector.text)

      if (matches.length === 0) {
        throw new CodeSnippetHighlightResolutionError({
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
          reason: "NoMatch",
          matches: 0,
        })
      }

      if (matches.length > 1 && !input.selector.occurrence) {
        throw new CodeSnippetHighlightResolutionError({
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
          reason: "AmbiguousMatch",
          matches: matches.length,
        })
      }

      const occurrence = input.selector.occurrence ?? 1
      if (
        !Number.isInteger(occurrence) ||
        occurrence < 1 ||
        occurrence > matches.length
      ) {
        throw new CodeSnippetHighlightResolutionError({
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
          reason: "InvalidRange",
          matches: matches.length,
        })
      }

      const startOffset = matches[occurrence - 1]!
      const endOffset = startOffset + input.selector.text.length

      return ensureValidRange(
        { startOffset, endOffset },
        {
          sourceLength: input.source.length,
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
        },
      )
    }
    case "LineRange": {
      const lineStarts = getLineStartOffsets(input.source)
      const lineCount = lineStarts.length
      const { startLine, endLine } = input.selector

      if (
        !Number.isInteger(startLine) ||
        !Number.isInteger(endLine) ||
        startLine < 1 ||
        endLine < startLine ||
        endLine > lineCount
      ) {
        throw new CodeSnippetHighlightResolutionError({
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
          reason: "InvalidRange",
        })
      }

      const startOffset = lineStarts[startLine - 1]!
      const endOffset =
        endLine === lineCount ? input.source.length : lineStarts[endLine]!

      return ensureValidRange(
        { startOffset, endOffset },
        {
          sourceLength: input.source.length,
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
        },
      )
    }
    case "OffsetRange": {
      return ensureValidRange(
        {
          startOffset: input.selector.startOffset,
          endOffset: input.selector.endOffset,
        },
        {
          sourceLength: input.source.length,
          exampleLabel: input.exampleLabel,
          targetKey: input.targetKey,
          selector: stringifySelector(input.selector),
        },
      )
    }
  }
}

const findTextMatches = (
  source: string,
  target: string,
): ReadonlyArray<number> => {
  if (target.length === 0) {
    return []
  }

  const matches: Array<number> = []
  let searchOffset = 0

  while (searchOffset <= source.length) {
    const matchIndex = source.indexOf(target, searchOffset)

    if (matchIndex === -1) {
      break
    }

    matches.push(matchIndex)
    searchOffset = matchIndex + 1
  }

  return matches
}

const getLineStartOffsets = (source: string): ReadonlyArray<number> => {
  const lineStarts: Array<number> = [0]

  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\n") {
      lineStarts.push(index + 1)
    }
  }

  return lineStarts
}

const ensureValidRange = (
  range: ResolvedOffsetRange,
  options: {
    readonly sourceLength: number
    readonly exampleLabel: string
    readonly targetKey: string
    readonly selector: string
  },
): ResolvedOffsetRange => {
  if (
    !Number.isInteger(range.startOffset) ||
    !Number.isInteger(range.endOffset) ||
    range.startOffset < 0 ||
    range.startOffset >= range.endOffset ||
    range.endOffset > options.sourceLength
  ) {
    throw new CodeSnippetHighlightResolutionError({
      exampleLabel: options.exampleLabel,
      targetKey: options.targetKey,
      selector: options.selector,
      reason: "InvalidRange",
    })
  }

  return range
}

const mergeRanges = (
  ranges: ReadonlyArray<ResolvedOffsetRange>,
): ReadonlyArray<ResolvedOffsetRange> => {
  if (ranges.length < 2) {
    return ranges
  }

  const sortedRanges = Array.from(ranges).sort((first, second) => {
    if (first.startOffset === second.startOffset) {
      return first.endOffset - second.endOffset
    }

    return first.startOffset - second.startOffset
  })

  const mergedRanges: Array<ResolvedOffsetRange> = [sortedRanges[0]!]

  for (let index = 1; index < sortedRanges.length; index++) {
    const nextRange = sortedRanges[index]!
    const previousRange = mergedRanges[mergedRanges.length - 1]!

    if (nextRange.startOffset <= previousRange.endOffset) {
      mergedRanges[mergedRanges.length - 1] = {
        startOffset: previousRange.startOffset,
        endOffset: Math.max(previousRange.endOffset, nextRange.endOffset),
      }
      continue
    }

    mergedRanges.push(nextRange)
  }

  return mergedRanges
}

const stringifySelector = (selector: HighlightSelector): string => {
  switch (selector._tag) {
    case "Text": {
      const occurrenceText = selector.occurrence
        ? `, occurrence=${selector.occurrence.toString()}`
        : ""
      return `Text(${JSON.stringify(selector.text)}${occurrenceText})`
    }
    case "LineRange":
      return `LineRange(${selector.startLine.toString()}-${selector.endLine.toString()})`
    case "OffsetRange":
      return `OffsetRange(${selector.startOffset.toString()}-${selector.endOffset.toString()})`
  }
}
