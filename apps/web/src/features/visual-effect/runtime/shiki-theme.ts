import type { ThemeRegistrationAny } from "shiki/types"

export const EFFECT_SHIKI_THEME_NAME = "effect-dark"

export const effectShikiTheme: ThemeRegistrationAny = {
  name: EFFECT_SHIKI_THEME_NAME,
  type: "dark",
  colors: {
    "editor.foreground": "#d4d4d8",
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
      settings: { foreground: "#a78bfa" },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "meta.attribute",
        "template.expression",
        "attr-value",
      ],
      settings: { foreground: "#34d399" },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#71717a", fontStyle: "italic" },
    },
    {
      scope: [
        "entity.name.function",
        "entity.name.type",
        "function",
        "class-name",
      ],
      settings: { foreground: "#f4f4f5" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language.boolean",
        "number",
        "boolean",
      ],
      settings: { foreground: "#fbbf24" },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: { foreground: "#a1a1aa" },
    },
    {
      scope: [
        "variable",
        "support.constant",
        "entity.other.attribute-name",
        "property",
        "constant",
      ],
      settings: { foreground: "#d4d4d8" },
    },
  ],
}
