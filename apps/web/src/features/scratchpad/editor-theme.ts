import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import type { Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"

/**
 * CodeMirror picks its built-in light or dark styles from a flag on the theme,
 * fixed when the editor is created. The site switches theme at run time with a
 * `.dark` class that also sets `color-scheme`, so every color here uses CSS
 * `light-dark()` and follows the site without rebuilding the editor. Leaving
 * these to CodeMirror's light defaults put light-grey tooltips under the dark
 * theme's near-white text.
 */
const ld = (light: string, dark: string): string =>
  `light-dark(${light}, ${dark})`

/**
 * Syntax colors from the Playground's Monaco themes
 * (`features/playground/services/monaco/themes.ts`): `chrome-devtools` in light
 * mode and `dracula` in dark mode. Monaco's TypeScript tokenizer only emits
 * keyword, string, comment, number, regexp, `type.identifier`, delimiter and
 * identifier tokens, and both themes inherit Monaco's `vs`/`vs-dark` colors for
 * the ones they leave out (number, type, regexp, delimiter). The values below
 * are the colors those tokens actually render with in the Playground. Lezer
 * tags finer-grained than Monaco's tokens (function and property names, for
 * example) use the plain foreground so the two editors look the same.
 */
const playground = {
  foreground: ld("#000000", "#f8f8f2"),
  keyword: ld("#aa0d91", "#ff79c6"),
  string: ld("#c41a16", "#f1fa8c"),
  comment: ld("#007400", "#6272a4"),
  number: ld("#098658", "#b5cea8"),
  type: ld("#008080", "#3dc9b0"),
  regexp: ld("#800000", "#b46695"),
  delimiter: ld("#000000", "#dcdcdc"),
  invalid: ld("#ff0000", "#f8f8f0"),
}

const surface = ld("#ffffff", "#18181b")
const surfaceRaised = ld("#f4f4f5", "#27272a")
const text = ld("#18181b", "#f4f4f5")
const textMuted = ld("#71717a", "#a1a1aa")
const border = ld("#d4d4d8", "#3f3f46")
const selected = ld("#e4e4e7", "#3f3f46")
const accent = ld("#059669", "#34d399")

const errorColor = ld("#dc2626", "#f87171")
const warningColor = ld("#d97706", "#fbbf24")
const infoColor = ld("#0284c7", "#38bdf8")
const hintColor = ld("#71717a", "#a1a1aa")

const theme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily:
      "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    backgroundColor: "transparent",
    color: text,
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "16px 0",
    caretColor: ld("#000000", "#f8f8f0"),
    color: playground.foreground,
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: ld("#000000", "#f8f8f0"),
  },
  "& .cm-selectionBackground": {
    backgroundColor: ld("#e4e4e7", "#3f3f46"),
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: ld("#bad6fd", "#44475a"),
  },
  ".cm-selectionMatch": {
    backgroundColor: ld("#a7f3d066", "#34d39933"),
  },
  "&.cm-focused .cm-matchingBracket": {
    backgroundColor: ld("#a7f3d0", "#065f46"),
  },
  "&.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: ld("#fecaca", "#7f1d1d"),
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: textMuted,
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "3ch",
    padding: "0 6px 0 16px",
    textAlign: "right",
  },
  ".cm-foldGutter .cm-gutterElement": {
    width: "16px",
    padding: "0 4px 0 2px",
    textAlign: "center",
    color: textMuted,
  },
  ".cm-gutterElement.cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: text,
  },
  ".cm-activeLine": {
    backgroundColor: ld("#71717a12", "#a1a1aa14"),
  },
  ".cm-foldPlaceholder": {
    backgroundColor: surfaceRaised,
    border: `1px solid ${border}`,
    color: textMuted,
  },
  "&.cm-focused": {
    outline: "none",
  },

  // Tooltips: hover, diagnostics, completion and signature help.
  ".cm-tooltip": {
    backgroundColor: surface,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    boxShadow: `0 8px 24px ${ld("#18181b26", "#00000080")}`,
    fontSize: "13px",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-hover": {
    maxWidth: "min(640px, 80vw)",
  },
  ".cm-tooltip .cm-tooltip-section:not(:first-child)": {
    borderTop: `1px solid ${border}`,
  },
  ".cm-tooltip-arrow:before": {
    borderTopColor: border,
    borderBottomColor: border,
  },
  ".cm-tooltip-arrow:after": {
    borderTopColor: surface,
    borderBottomColor: surface,
  },

  // Language server hover and documentation content (rendered Markdown).
  ".cm-lsp-hover-tooltip, .cm-lsp-completion-documentation": {
    maxHeight: "min(360px, 50vh)",
    overflow: "auto",
  },
  ".cm-lsp-documentation": {
    padding: "6px 10px",
    lineHeight: "1.5",
    fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
    "& p": {
      margin: "4px 0",
    },
    "& pre": {
      margin: "4px 0",
      padding: "6px 8px",
      borderRadius: "4px",
      backgroundColor: surfaceRaised,
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    },
    "& pre, & code": {
      fontFamily:
        "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
      fontSize: "12.5px",
    },
    "& :not(pre) > code": {
      padding: "1px 4px",
      borderRadius: "3px",
      backgroundColor: surfaceRaised,
    },
    "& a": {
      color: accent,
      textDecoration: "underline",
    },
    "& hr": {
      border: "none",
      borderTop: `1px solid ${border}`,
      margin: "6px 0",
    },
  },
  ".cm-lsp-signature-tooltip": {
    padding: "4px 8px",
    "& .cm-lsp-active-parameter": {
      color: accent,
      fontWeight: "600",
    },
    "& .cm-lsp-signature-num": {
      color: textMuted,
    },
  },

  // Diagnostics.
  ".cm-tooltip-lint": {
    padding: "0",
  },
  ".cm-diagnostic": {
    padding: "6px 10px 6px 8px",
    borderLeft: "3px solid transparent",
    color: text,
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
  },
  ".cm-diagnostic:not(:first-child)": {
    borderTop: `1px solid ${border}`,
  },
  ".cm-diagnostic-error": { borderLeftColor: errorColor },
  ".cm-diagnostic-warning": { borderLeftColor: warningColor },
  ".cm-diagnostic-info": { borderLeftColor: infoColor },
  ".cm-diagnostic-hint": { borderLeftColor: hintColor },
  ".cm-diagnosticSource": {
    color: textMuted,
    opacity: "1",
    fontSize: "12px",
  },
  ".cm-diagnosticAction": {
    backgroundColor: surfaceRaised,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: "4px",
  },

  // Completion list.
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: "inherit",
      maxHeight: "16em",
    },
    "& > ul > li": {
      padding: "2px 8px",
      color: text,
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: selected,
      color: text,
    },
    "& > ul > completion-section": {
      color: textMuted,
      borderBottom: `1px solid ${border}`,
    },
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    color: accent,
    fontWeight: "600",
  },
  ".cm-completionDetail": {
    color: textMuted,
    fontStyle: "normal",
  },
  ".cm-completionIcon": {
    color: textMuted,
    opacity: "1",
  },
  ".cm-tooltip.cm-completionInfo": {
    padding: "0",
    maxWidth: "min(480px, 60vw)",
  },

  // Panels: search, rename, references and server messages.
  ".cm-panels": {
    backgroundColor: surfaceRaised,
    color: text,
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: `1px solid ${border}`,
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: `1px solid ${border}`,
  },
  ".cm-panel button[name=close]": {
    color: textMuted,
  },
  ".cm-textfield": {
    backgroundColor: surface,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: "4px",
  },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: surface,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: "4px",
  },
  ".cm-button:active": {
    backgroundImage: "none",
    backgroundColor: selected,
  },
  ".cm-searchMatch": {
    backgroundColor: ld("#fde68a", "#854d0e"),
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: ld("#fdba74", "#c2410c"),
  },
  ".cm-lsp-reference-panel": {
    "& .cm-lsp-reference-file": {
      color: textMuted,
    },
    "& .cm-lsp-reference[aria-selected]": {
      backgroundColor: selected,
    },
    "& .cm-lsp-reference-line": {
      color: textMuted,
    },
  },
  ".cm-lsp-message": {
    padding: "4px 10px",
  },
  ".cm-lsp-message-error": { color: errorColor },
  ".cm-lsp-message-warning": { color: warningColor },
})

const highlightStyle = HighlightStyle.define([
  { tag: [t.comment, t.meta], color: playground.comment },
  {
    tag: [
      t.keyword,
      t.modifier,
      t.operatorKeyword,
      t.controlKeyword,
      t.definitionKeyword,
      t.moduleKeyword,
      t.bool,
      t.null,
      t.atom,
      t.self,
    ],
    color: playground.keyword,
  },
  { tag: [t.string, t.special(t.string)], color: playground.string },
  { tag: [t.regexp, t.escape], color: playground.regexp },
  { tag: t.number, color: playground.number },
  {
    tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)],
    color: playground.type,
  },
  {
    tag: [t.operator, t.punctuation, t.separator, t.bracket],
    color: playground.delimiter,
  },
  {
    tag: [
      t.variableName,
      t.propertyName,
      t.function(t.variableName),
      t.function(t.propertyName),
      t.definition(t.variableName),
      t.labelName,
    ],
    color: playground.foreground,
  },
  { tag: t.invalid, color: playground.invalid },
  { tag: t.link, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "600" },
  { tag: t.strong, fontWeight: "600" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
])

export const scratchpadEditorTheme: Extension = [
  theme,
  syntaxHighlighting(highlightStyle),
]
