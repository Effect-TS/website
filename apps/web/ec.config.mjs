import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections"
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers"
import { pluginOpenInPlayground } from "./src/plugins/expressive-code/open-in-playground.ts"

export default {
  plugins: [
    pluginCollapsibleSections(),
    pluginLineNumbers(),
    pluginOpenInPlayground(),
  ],
  styleOverrides: {
    borderColor: ["oklch(27.4% 0.006 286.033)", "oklch(92% 0.004 286.32)"],
    borderRadius: "calc(0.5rem - 1px)",
    borderWidth: "1px",
    codeBackground: [
      "oklch(21% 0.006 285.885 / 60%)",
      "oklch(96.7% 0.001 286.375 / 60%)",
    ],
    codeFontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    codeFontSize: "0.85rem",
    codeLineHeight: "1.65",
    codePaddingBlock: "1.25rem",
    codePaddingInline: "1.4rem",
  },
  themes: ["github-light", "github-dark"],
  useDarkModeMediaQuery: false,
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
}
