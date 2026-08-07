export type CodeSnippetLanguage = "bash" | "javascript" | "json" | "typescript"

export const CodeSnippet = {
  typescriptPropertyName,
} as const

const identifier = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u
const computedProperty = /^\[[^\]\r\n]+\]$/

function typescriptPropertyName(name: string): string {
  return identifier.test(name) || computedProperty.test(name)
    ? name
    : JSON.stringify(name)
}
