import { syntaxTree } from "@codemirror/language"
import {
  type EditorState,
  type Extension,
  Prec,
  RangeSetBuilder,
} from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"

/**
 * Highlighting that Lezer's tags can't express but the Playground's Monaco
 * editor shows, so the two editors look the same:
 *
 * - Monaco's TypeScript tokenizer is a lexer, not a parser. It colors any
 *   identifier that starts with a capital letter as a type (`Effect`,
 *   `Schema`, `Promise`), and any identifier on its keyword list as a keyword
 *   (`number`, `string`, `undefined`), wherever it appears. Both depend on the
 *   identifier's text, which a `HighlightStyle` never sees.
 * - Monaco colors `()`, `[]` and `{}` by nesting depth, cycling through three
 *   colors. Depth counts every bracket kind together.
 * - The `*` in `yield*` and `function*` is a delimiter in Monaco, but Lezer
 *   tags it like `async` and `static`.
 *
 * The colors live in `editor-theme.ts`, under the classes this plugin adds.
 */

/** Monaco's TypeScript keyword list (`basic-languages/typescript`). */
const MONACO_KEYWORDS = new Set([
  "abstract",
  "any",
  "as",
  "asserts",
  "bigint",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "continue",
  "const",
  "constructor",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "module",
  "namespace",
  "never",
  "new",
  "null",
  "number",
  "object",
  "out",
  "package",
  "private",
  "protected",
  "public",
  "override",
  "readonly",
  "require",
  "global",
  "return",
  "satisfies",
  "set",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "unique",
  "unknown",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "async",
  "await",
  "of",
])

const IDENTIFIER_NODES = new Set([
  "VariableName",
  "VariableDefinition",
  "PropertyName",
  "PropertyDefinition",
  "TypeName",
  "TypeDefinition",
  "Label",
])

const OPEN_BRACKETS = new Set(["(", "[", "{"])
const CLOSE_BRACKETS = new Set([")", "]", "}"])

export const BRACKET_COLOR_COUNT = 3

export interface MonacoToken {
  readonly from: number
  readonly to: number
  readonly className: string
}

/**
 * The Monaco-only tokens that end inside `from` to `to`, in document order.
 * Bracket depth depends on everything before `from`, so the walk starts at the
 * top of the document. Scratchpad files are small.
 */
export const monacoTokenClasses = (
  state: EditorState,
  from: number,
  to: number,
): ReadonlyArray<MonacoToken> => {
  const tokens: Array<MonacoToken> = []
  const add = (
    node: { readonly from: number; readonly to: number },
    className: string,
  ) => {
    if (node.to > from) {
      tokens.push({ from: node.from, to: node.to, className })
    }
  }
  const bracket = (depth: number) =>
    `cm-monaco-bracket-${depth % BRACKET_COLOR_COUNT}`
  let depth = 0
  syntaxTree(state).iterate({
    to,
    enter: (node) => {
      const { name } = node
      if (OPEN_BRACKETS.has(name)) {
        add(node, bracket(depth++))
      } else if (CLOSE_BRACKETS.has(name)) {
        add(
          node,
          depth === 0 ? "cm-monaco-bracket-unexpected" : bracket(--depth),
        )
      } else if (name === "Star") {
        add(node, "cm-monaco-delimiter")
      } else if (IDENTIFIER_NODES.has(name)) {
        const text = state.sliceDoc(node.from, node.to)
        if (MONACO_KEYWORDS.has(text)) add(node, "cm-monaco-keyword")
        else if (/^[A-Z]/.test(text)) add(node, "cm-monaco-type")
        return false
      }
      return undefined
    },
  })
  return tokens
}

const marks = new Map<string, Decoration>()
const mark = (className: string): Decoration => {
  let decoration = marks.get(className)
  if (decoration === undefined) {
    decoration = Decoration.mark({ class: className })
    marks.set(className, decoration)
  }
  return decoration
}

const build = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>()
  const { from, to } = view.viewport
  for (const token of monacoTokenClasses(view.state, from, to)) {
    builder.add(token.from, token.to, mark(token.className))
  }
  return builder.finish()
}

// High precedence, like the syntax highlighter's: CodeMirror draws
// higher-precedence marks inside lower ones, so these never split a wider
// mark, such as a diagnostic's underline, into pieces.
export const monacoTokens: Extension = Prec.high(
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view)
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)
        ) {
          this.decorations = build(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
)
