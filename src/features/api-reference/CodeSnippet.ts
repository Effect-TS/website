import { format as formatWithOxfmt } from "oxfmt"

export type CodeSnippetLanguage = "bash" | "javascript" | "json" | "typescript"

export type CodeSnippet =
  | { readonly status: "formatted"; readonly code: string }
  | { readonly status: "invalid"; readonly code: string; readonly errors: ReadonlyArray<string> }
  | { readonly status: "unsupported"; readonly code: string }

export const CodeSnippet = {
  formatExample,
  formatSignature,
  typescriptPropertyName,
} as const

const cache = new Map<string, Promise<CodeSnippet>>()
const identifier = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u
const computedProperty = /^\[[^\]\r\n]+\]$/

function formatExample(source: string, language: CodeSnippetLanguage): Promise<CodeSnippet> {
  if (language === "bash") {
    return Promise.resolve({ status: "unsupported", code: source })
  }
  const extension = language === "typescript" ? "ts" : language === "javascript" ? "js" : "json"
  return format(`${language}:example`, `api-example.${extension}`, source, false)
}

function formatSignature(source: string): Promise<CodeSnippet> {
  return format("typescript:signature", "api-signature.ts", source, true)
}

function format(
  cacheNamespace: string,
  fileName: string,
  source: string,
  semi: boolean,
): Promise<CodeSnippet> {
  const cacheKey = `${cacheNamespace}\0${source}`
  const cached = cache.get(cacheKey)
  if (cached !== undefined) return cached

  const pending = formatWithOxfmt(fileName, source, { printWidth: 100, semi }).then((result) => {
    const errors = result.errors
      .filter((error) => error.severity === "Error")
      .map((error) => error.message)
    return errors.length === 0
      ? ({ status: "formatted", code: result.code.trimEnd() } as const)
      : ({ status: "invalid", code: source, errors } as const)
  })
  cache.set(cacheKey, pending)
  return pending
}

function typescriptPropertyName(name: string): string {
  return identifier.test(name) || computedProperty.test(name) ? name : JSON.stringify(name)
}
