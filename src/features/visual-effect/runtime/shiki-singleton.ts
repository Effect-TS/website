import type { HighlighterCore } from "@shikijs/core"
import type { ThemedToken } from "shiki/types"
import type { SnippetLanguage } from "@/features/visual-effect/model/snippet-highlights"
import { effectShikiTheme } from "./shiki-theme"

let highlighterPromise: Promise<HighlighterCore> | undefined = undefined

export const docsShikiThemes = {
  light: "github-light",
  dark: "github-dark",
} as const

const tokensBySnippetKey = new Map<string, Promise<ReadonlyArray<ReadonlyArray<ThemedToken>>>>()

export const getHighlighter = (): Promise<HighlighterCore> => {
  if (highlighterPromise !== undefined) {
    return highlighterPromise
  }

  highlighterPromise = Promise.all([
    import("@shikijs/core"),
    import("@shikijs/engine-javascript"),
    import("@shikijs/langs/typescript"),
    import("@shikijs/langs/javascript"),
    import("@shikijs/langs/bash"),
    import("@shikijs/langs/json"),
    import("shiki/themes"),
  ]).then(
    ([
      { createHighlighterCore },
      { createJavaScriptRegexEngine },
      typescript,
      javascript,
      bash,
      json,
      { bundledThemes },
    ]) =>
      createHighlighterCore({
        themes: [
          effectShikiTheme,
          bundledThemes[docsShikiThemes.light],
          bundledThemes[docsShikiThemes.dark],
        ],
        langs: [typescript, javascript, bash, json],
        engine: createJavaScriptRegexEngine(),
      }),
  )

  return highlighterPromise
}

export const getSnippetTokens = (
  language: SnippetLanguage,
  source: string,
): Promise<ReadonlyArray<ReadonlyArray<ThemedToken>>> => {
  const key = `${language}::${source}`
  const cached = tokensBySnippetKey.get(key)
  if (cached !== undefined) {
    return cached
  }

  const tokenPromise = getHighlighter()
    .then((highlighter) =>
      highlighter.codeToTokensBase(source, { lang: language, theme: effectShikiTheme }),
    )
    .catch((error) => {
      tokensBySnippetKey.delete(key)
      throw error
    })

  tokensBySnippetKey.set(key, tokenPromise)
  return tokenPromise
}
