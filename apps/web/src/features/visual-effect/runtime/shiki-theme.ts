import type { ThemeRegistrationAny } from "shiki/types"

export type SnippetColorScheme = "light" | "dark"

interface SnippetPalette {
  readonly foreground: string
  readonly keyword: string
  readonly string: string
  readonly comment: string
  readonly identifier: string
  readonly number: string
  readonly punctuation: string
}

// Tailwind palette values, one tone per role in each scheme.
const palettes: Record<SnippetColorScheme, SnippetPalette> = {
  dark: {
    foreground: "#d4d4d8", // zinc-300
    keyword: "#a78bfa", // violet-400
    string: "#34d399", // emerald-400
    comment: "#71717a", // zinc-500
    identifier: "#f4f4f5", // zinc-100
    number: "#fbbf24", // amber-400
    punctuation: "#a1a1aa", // zinc-400
  },
  light: {
    foreground: "#3f3f46", // zinc-700
    keyword: "#7c3aed", // violet-600
    string: "#059669", // emerald-600
    comment: "#71717a", // zinc-500
    identifier: "#18181b", // zinc-900
    number: "#b45309", // amber-700
    punctuation: "#71717a", // zinc-500
  },
}

const makeTheme = (scheme: SnippetColorScheme): ThemeRegistrationAny => {
  const palette = palettes[scheme]
  return {
    name: `effect-${scheme}`,
    type: scheme,
    colors: {
      "editor.foreground": palette.foreground,
      "editor.background": "#00000000",
    },
    tokenColors: [
      {
        scope: [
          "keyword",
          "storage",
          "keyword.operator",
          "entity.name.tag",
          "attr-name",
        ],
        settings: { foreground: palette.keyword },
      },
      {
        scope: [
          "string",
          "string.quoted",
          "meta.attribute",
          "template.expression",
          "attr-value",
        ],
        settings: { foreground: palette.string },
      },
      {
        scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: palette.comment, fontStyle: "italic" },
      },
      {
        scope: [
          "entity.name.function",
          "entity.name.type",
          "function",
          "class-name",
        ],
        settings: { foreground: palette.identifier },
      },
      {
        scope: [
          "constant.numeric",
          "constant.language.boolean",
          "number",
          "boolean",
        ],
        settings: { foreground: palette.number },
      },
      {
        scope: ["punctuation", "meta.brace"],
        settings: { foreground: palette.punctuation },
      },
      {
        scope: [
          "variable",
          "support.constant",
          "entity.other.attribute-name",
          "property",
          "constant",
        ],
        settings: { foreground: palette.foreground },
      },
    ],
  }
}

export const effectShikiThemes: Record<
  SnippetColorScheme,
  ThemeRegistrationAny
> = {
  dark: makeTheme("dark"),
  light: makeTheme("light"),
}
