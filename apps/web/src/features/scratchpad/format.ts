import {
  EditorSelection,
  type EditorState,
  type Extension,
  Prec,
  StateEffect,
  StateField,
  type Text,
} from "@codemirror/state"
import {
  type Command,
  EditorView,
  keymap,
  type Panel,
  showPanel,
} from "@codemirror/view"
import type { Formatter } from "@dprint/formatter"

/**
 * Format-on-save: Ctrl/Cmd+S formats the active file with dprint, using the
 * Workspace's `dprint.json` and the plugins it names (loaded on the first
 * format, then cached). Failures show a small message under the editor and
 * leave the text alone.
 */

export type FormatResult =
  | { readonly _tag: "Formatted"; readonly text: string }
  | { readonly _tag: "Failed"; readonly message: string }

/** Formats one file's text. Never rejects: failures are `Failed`. */
export interface DocumentFormatter {
  readonly format: (path: string, text: string) => Promise<FormatResult>
}

/** The parts of a dprint plugin the formatter uses. */
export type DprintPlugin = Pick<
  Formatter,
  "setConfig" | "getConfigDiagnostics" | "getFileMatchingInfo" | "formatText"
> & { readonly getPluginInfo: () => { readonly configKey: string } }

export interface DprintDocumentFormatterOptions {
  /** The Workspace's `dprint.json`, or `undefined` when it has none. */
  readonly readConfig: () => Promise<string | undefined>
  /** Loads one `dprint.json` plugin entry. Default: through `/api/dprint`. */
  readonly loadPlugin?: ((plugin: string) => Promise<DprintPlugin>) | undefined
}

const GLOBAL_CONFIG_KEYS = [
  "lineWidth",
  "indentWidth",
  "useTabs",
  "newLineKind",
] as const

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const loadPluginThroughProxy = async (plugin: string) => {
  const [{ loadDprintPlugin }, Effect] = await Promise.all([
    import("@/features/format/dprint"),
    import("effect/Effect"),
  ])
  const { formatter } = await Effect.runPromise(loadDprintPlugin(plugin))
  return formatter
}

const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf("/") + 1)
  const dot = name.lastIndexOf(".")
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase()
}

const pluginMatches = (plugin: DprintPlugin, path: string): boolean => {
  const { fileExtensions, fileNames } = plugin.getFileMatchingInfo()
  const name = path.slice(path.lastIndexOf("/") + 1)
  const ext = extensionOf(path)
  return (
    fileNames.includes(name) ||
    fileExtensions.some((e) => e.replace(/^\./, "").toLowerCase() === ext)
  )
}

/**
 * A formatter that reads `dprint.json` on every format (so edits to it apply
 * at once) and keeps loaded plugins for the session. A plugin that fails to
 * load is tried again on the next format.
 */
export const makeDprintDocumentFormatter = (
  options: DprintDocumentFormatterOptions,
): DocumentFormatter => {
  const loadPlugin = options.loadPlugin ?? loadPluginThroughProxy
  const plugins = new Map<string, Promise<DprintPlugin>>()

  const pluginFor = (entry: string): Promise<DprintPlugin> => {
    let loading = plugins.get(entry)
    if (loading === undefined) {
      loading = loadPlugin(entry)
      plugins.set(entry, loading)
      loading.catch(() => {
        if (plugins.get(entry) === loading) plugins.delete(entry)
      })
    }
    return loading
  }

  const failed = (message: string): FormatResult => ({
    _tag: "Failed",
    message,
  })

  return {
    format: async (path, text) => {
      let raw: string | undefined
      try {
        raw = await options.readConfig()
      } catch (error) {
        return failed(`Could not read dprint.json: ${errorMessage(error)}`)
      }
      if (raw === undefined) {
        return failed(
          "Nothing to format with: the Workspace has no dprint.json",
        )
      }

      let config: Record<string, unknown>
      try {
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("expected an object")
        }
        config = parsed as Record<string, unknown>
      } catch (error) {
        return failed(`dprint.json is not valid JSON: ${errorMessage(error)}`)
      }
      const entries = config.plugins
      if (
        !Array.isArray(entries) ||
        !entries.every((e) => typeof e === "string")
      ) {
        return failed('dprint.json needs a "plugins" array of plugin URLs')
      }

      let loaded: ReadonlyArray<DprintPlugin>
      try {
        loaded = await Promise.all(entries.map(pluginFor))
      } catch (error) {
        return failed(errorMessage(error))
      }

      const global: Record<string, unknown> = {}
      for (const key of GLOBAL_CONFIG_KEYS) {
        if (key in config) global[key] = config[key]
      }
      try {
        // A plugin's file matching depends on its config, and dprint plugins
        // panic when asked before they have one.
        for (const plugin of loaded) {
          const section = config[plugin.getPluginInfo().configKey]
          plugin.setConfig(
            global,
            typeof section === "object" && section !== null
              ? (section as Record<string, unknown>)
              : {},
          )
        }
        const plugin = loaded.find((p) => pluginMatches(p, path))
        if (plugin === undefined) {
          return failed(`No dprint plugin in dprint.json formats ${path}`)
        }
        const diagnostics = plugin.getConfigDiagnostics()
        if (diagnostics.length > 0) {
          const key = plugin.getPluginInfo().configKey
          return failed(
            `dprint.json: ${diagnostics
              .map((d) => `${key}.${d.propertyName}: ${d.message}`)
              .join("; ")}`,
          )
        }
        return {
          _tag: "Formatted",
          text: plugin.formatText({ filePath: path, fileText: text }),
        }
      } catch (error) {
        return failed(`Could not format ${path}: ${errorMessage(error)}`)
      }
    },
  }
}

// --- Cursor mapping -------------------------------------------------------

const isSpace = (code: number) =>
  code === 32 || code === 9 || code === 10 || code === 13

/**
 * Where `offset` in `before` lands in `after`, when `after` is `before` with
 * whitespace and a little punctuation changed. A cursor right before code
 * stays right before the same code; otherwise it stays right after it.
 */
export const mapOffsetThroughFormat = (
  before: string,
  after: string,
  offset: number,
): number => {
  let count = 0
  for (let i = 0; i < offset && i < before.length; i++) {
    if (!isSpace(before.charCodeAt(i))) count++
  }
  const beforeCode =
    offset < before.length && !isSpace(before.charCodeAt(offset))
  // Before code: just before the (count + 1)th code character in `after`.
  // Otherwise: just after the count-th.
  const target = beforeCode ? count + 1 : count
  if (target === 0) return 0
  let seen = 0
  for (let i = 0; i < after.length; i++) {
    if (!isSpace(after.charCodeAt(i))) {
      seen++
      if (seen === target) return beforeCode ? i : i + 1
    }
  }
  return after.length
}

/** The smallest single replacement turning `before` into `after`. */
const minimalChange = (before: string, after: string) => {
  const max = Math.min(before.length, after.length)
  let from = 0
  while (from < max && before.charCodeAt(from) === after.charCodeAt(from)) {
    from++
  }
  let end = 0
  while (
    end < max - from &&
    before.charCodeAt(before.length - 1 - end) ===
      after.charCodeAt(after.length - 1 - end)
  ) {
    end++
  }
  return {
    from,
    to: before.length - end,
    insert: after.slice(from, after.length - end),
  }
}

// --- Messages under the editor -------------------------------------------

const setFormatMessage = StateEffect.define<string | null>()

const MESSAGE_MS = 6_000

const formatMessageField = StateField.define<string | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setFormatMessage)) return effect.value
    }
    return tr.docChanged ? null : value
  },
  provide: (field) =>
    showPanel.from(field, (message) =>
      message === null ? null : (view) => formatMessagePanel(view, message),
    ),
})

const formatMessagePanel = (_view: EditorView, message: string): Panel => {
  const dom = document.createElement("div")
  dom.className = "cm-format-message"
  dom.setAttribute("role", "status")
  dom.setAttribute("data-testid", "format-message")
  dom.textContent = message
  return { dom }
}

const formatMessageTheme = EditorView.baseTheme({
  ".cm-format-message": {
    padding: "2px 8px",
    fontSize: "12px",
    opacity: "0.85",
  },
})

/** The message the last failed format left, or `null`. */
export const formatMessageOf = (state: EditorState): string | null =>
  state.field(formatMessageField, false) ?? null

// --- The command -----------------------------------------------------------

/**
 * Formats the view's document and applies the result as one undoable
 * transaction, keeping each cursor near where it was. The result is dropped
 * when the document changed while formatting. Always handles the key, so the
 * browser's save dialog never opens.
 */
export const formatDocumentCommand =
  (formatter: DocumentFormatter, path: string): Command =>
  (view) => {
    if (view.state.readOnly) return true
    const doc: Text = view.state.doc
    const before = doc.toString()
    void formatter.format(path, before).then((result) => {
      if (view.state.doc !== doc) return
      if (result._tag === "Failed") {
        view.dispatch({ effects: setFormatMessage.of(result.message) })
        // A later edit or format clears it earlier.
        setTimeout(() => {
          if (formatMessageOf(view.state) === result.message) {
            view.dispatch({ effects: setFormatMessage.of(null) })
          }
        }, MESSAGE_MS)
        return
      }
      const after = result.text
      const clear =
        formatMessageOf(view.state) === null ? [] : [setFormatMessage.of(null)]
      if (after === before) {
        if (clear.length > 0) view.dispatch({ effects: clear })
        return
      }
      const { selection } = view.state
      view.dispatch({
        changes: minimalChange(before, after),
        selection: EditorSelection.create(
          selection.ranges.map((range) =>
            EditorSelection.range(
              mapOffsetThroughFormat(before, after, range.anchor),
              mapOffsetThroughFormat(before, after, range.head),
            ),
          ),
          selection.mainIndex,
        ),
        effects: clear,
        userEvent: "format",
        scrollIntoView: true,
      })
    })
    return true
  }

/** Ctrl/Cmd+S formats `path` with `formatter`. */
export const formatOnSave = (
  formatter: DocumentFormatter,
  path: string,
): Extension => [
  formatMessageField,
  formatMessageTheme,
  Prec.high(
    keymap.of([
      {
        key: "Mod-s",
        run: formatDocumentCommand(formatter, path),
        preventDefault: true,
      },
    ]),
  ),
]
