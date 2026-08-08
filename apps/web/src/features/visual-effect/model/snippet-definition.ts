import type {
  CodeDefinitionOptions,
  CodeSnippetSelectorConfig,
  CodeSnippetSelectorOptions,
  ControlValues,
} from "./example-definition"
import {
  normalizeSelectorInput,
  resolveExampleCodeSnippet,
  snippetResultTargetKey,
  type CodeSnippet,
  type CodeSnippetConfig,
  HighlightSelector,
} from "./snippet-highlights"

export { type CodeSnippetConfig, HighlightSelector }

const resolveCodeDefinition = (
  definition: CodeDefinitionOptions,
  controls: ControlValues,
): CodeSnippetConfig => {
  if (typeof definition === "function") {
    return definition(controls)
  }

  return definition
}

const resolveSnippetSelectors = (
  definition: CodeSnippetSelectorOptions,
  controls: ControlValues,
): CodeSnippetSelectorConfig => {
  if (typeof definition === "function") {
    return definition(controls)
  }

  return definition
}

export const resolveSnippetDefinition = ({
  codeDefinition,
  selectorsByTarget,
  resultHighlightDefinition,
  controlValues,
  exampleLabel,
}: {
  readonly codeDefinition: CodeDefinitionOptions
  readonly selectorsByTarget: Record<string, CodeSnippetSelectorOptions>
  readonly resultHighlightDefinition: CodeSnippetSelectorOptions | undefined
  readonly controlValues: ControlValues
  readonly exampleLabel: string
}): CodeSnippet => {
  const resolvedSelectorsByTarget: Record<
    string,
    ReadonlyArray<HighlightSelector>
  > = {}

  for (const targetKey of Object.keys(selectorsByTarget)) {
    const selectorDefinition = selectorsByTarget[targetKey]

    if (selectorDefinition === undefined) {
      continue
    }

    resolvedSelectorsByTarget[targetKey] = normalizeSelectorInput(
      resolveSnippetSelectors(selectorDefinition, controlValues),
      {
        exampleLabel,
        targetKey,
      },
    )
  }

  if (resultHighlightDefinition !== undefined) {
    resolvedSelectorsByTarget[snippetResultTargetKey] = normalizeSelectorInput(
      resolveSnippetSelectors(resultHighlightDefinition, controlValues),
      {
        exampleLabel,
        targetKey: snippetResultTargetKey,
      },
    )
  }

  return resolveExampleCodeSnippet({
    code: resolveCodeDefinition(codeDefinition, controlValues),
    selectorsByTarget: resolvedSelectorsByTarget,
    exampleLabel,
  })
}
