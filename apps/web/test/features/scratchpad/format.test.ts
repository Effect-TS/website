import { history, undo } from "@codemirror/commands"
import {
  EditorSelection,
  EditorState,
  type TransactionSpec,
} from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { assert, describe, test } from "vite-plus/test"
import {
  type DocumentFormatter,
  type DprintPlugin,
  formatDocumentCommand,
  formatMessageOf,
  formatOnSave,
  type FormatResult,
  makeDprintDocumentFormatter,
} from "../../../src/features/scratchpad/format.ts"

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

/** A view with just enough surface for a command: state and dispatch. */
const makeView = (doc: string, cursor = 0, readOnly = false) => {
  let state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [
      history(),
      formatOnSave(formatsTo(doc), "x.ts"),
      readOnly ? EditorState.readOnly.of(true) : [],
    ],
  })
  const view = {
    get state() {
      return state
    },
    dispatch(spec: TransactionSpec) {
      state = state.update(spec).state
    },
  } as unknown as EditorView
  const type = (from: number, insert: string) =>
    view.dispatch({ changes: { from, insert } })
  const undoOnce = () =>
    undo({
      state,
      dispatch: (tr) => {
        state = tr.state
      },
    })
  return { view, type, undoOnce, text: () => state.doc.toString() }
}

const fakeFormatter = (
  format: (path: string, text: string) => FormatResult,
): DocumentFormatter => ({
  format: (path, text) => Promise.resolve(format(path, text)),
})

const formatsTo = (text: string): DocumentFormatter =>
  fakeFormatter(() => ({ _tag: "Formatted", text }))

describe("formatDocumentCommand", () => {
  test("replaces the document with the formatted text and handles the key", async () => {
    const { view, text } = makeView("const  a={b:1}")
    const handled = formatDocumentCommand(
      fakeFormatter(() => ({
        _tag: "Formatted",
        text: "const a = { b: 1 }\n",
      })),
      "src/main.ts",
    )(view)
    assert.isTrue(handled)
    await flush()
    assert.strictEqual(text(), "const a = { b: 1 }\n")
  })

  test("one undo restores the unformatted text", async () => {
    const original = "const  a={b:1}\nconst c   =2"
    const { view, text, undoOnce } = makeView(original)
    formatDocumentCommand(
      formatsTo("const a = { b: 1 }\nconst c = 2\n"),
      "x.ts",
    )(view)
    await flush()
    assert.notStrictEqual(text(), original)
    undoOnce()
    assert.strictEqual(text(), original)
  })

  test("keeps the cursor next to the same code", async () => {
    const original = "const  a={b:1,\n    c:2}"
    const cursor = original.indexOf("c:2")
    const { view } = makeView(original, cursor)
    formatDocumentCommand(formatsTo("const a = { b: 1, c: 2 }\n"), "x.ts")(view)
    await flush()
    const doc = view.state.doc.toString()
    const head = view.state.selection.main.head
    assert.strictEqual(doc, "const a = { b: 1, c: 2 }\n")
    assert.strictEqual(doc.slice(head, head + 3), "c: ")
  })

  test("a failure leaves the text untouched and shows a message", async () => {
    const original = "const  a = 1"
    const { view, text } = makeView(original)
    formatDocumentCommand(
      fakeFormatter(() => ({
        _tag: "Failed",
        message: "plugin download failed",
      })),
      "x.ts",
    )(view)
    await flush()
    assert.strictEqual(text(), original)
    assert.strictEqual(formatMessageOf(view.state), "plugin download failed")
  })

  test("drops the result when the text changed while formatting", async () => {
    const { view, type, text } = makeView("a  =  1")
    let resolve!: (result: FormatResult) => void
    formatDocumentCommand(
      { format: () => new Promise((r) => (resolve = r)) },
      "x.ts",
    )(view)
    type(0, "b")
    resolve({ _tag: "Formatted", text: "a = 1\n" })
    await flush()
    assert.strictEqual(text(), "ba  =  1")
  })

  test("leaves read-only files alone but still handles the key", async () => {
    const { view, text } = makeView("a  =  1", 0, true)
    const handled = formatDocumentCommand(
      formatsTo("a = 1\n"),
      "package.json",
    )(view)
    await flush()
    assert.deepStrictEqual(
      { handled, text: text() },
      { handled: true, text: "a  =  1" },
    )
  })
})

// --- dprint ---------------------------------------------------------------

interface FakePluginSpec {
  readonly configKey: string
  readonly extensions: ReadonlyArray<string>
  readonly format?: (text: string, config: Record<string, unknown>) => string
}

/** Like a real dprint plugin, panics when used before `setConfig`. */
const fakePlugin = (spec: FakePluginSpec): DprintPlugin => {
  let config: Record<string, unknown> | undefined
  const configured = () => {
    if (config === undefined) throw new Error("RuntimeError: unreachable")
    return config
  }
  return {
    getPluginInfo: () => ({ configKey: spec.configKey }),
    getFileMatchingInfo: () => {
      configured()
      return { fileExtensions: [...spec.extensions], fileNames: [] }
    },
    setConfig: (global, plugin) => {
      config = { ...global, ...plugin }
    },
    getConfigDiagnostics: () =>
      "bogus" in configured()
        ? [{ propertyName: "bogus", message: "Unknown property" }]
        : [],
    formatText: ({ fileText }) =>
      (spec.format ?? ((t) => `${spec.configKey}:${t}`))(
        fileText,
        configured(),
      ),
  }
}

const TS = "https://plugins.dprint.dev/typescript-0.96.1.wasm"
const JSON_PLUGIN = "https://plugins.dprint.dev/json-0.22.0.wasm"

const plugins: Record<string, FakePluginSpec> = {
  [TS]: {
    configKey: "typescript",
    extensions: ["ts", "tsx"],
    format: (t, c) => `${String(c.quoteStyle)}|${String(c.lineWidth)}|${t}`,
  },
  [JSON_PLUGIN]: { configKey: "json", extensions: ["json"] },
}

const dprintConfig = (config: object) => JSON.stringify(config)

const makeDprint = (options: {
  config: () => string | undefined
  load?: (plugin: string) => Promise<DprintPlugin>
}) => {
  return makeDprintDocumentFormatter({
    readConfig: () => Promise.resolve(options.config()),
    loadPlugin: (plugin) => {
      if (options.load !== undefined) return options.load(plugin)
      const spec = plugins[plugin]
      return spec === undefined
        ? Promise.reject(new Error(`no plugin ${plugin}`))
        : Promise.resolve(fakePlugin(spec))
    },
  })
}

describe("makeDprintDocumentFormatter", () => {
  test("formats with the plugin for the file's extension and its dprint.json section", async () => {
    const formatter = makeDprint({
      config: () =>
        dprintConfig({
          lineWidth: 100,
          typescript: { quoteStyle: "alwaysDouble" },
          plugins: [JSON_PLUGIN, TS],
        }),
    })
    assert.deepStrictEqual(await formatter.format("src/main.ts", "x"), {
      _tag: "Formatted",
      text: "alwaysDouble|100|x",
    })
    assert.deepStrictEqual(await formatter.format("package.json", "{}"), {
      _tag: "Formatted",
      text: "json:{}",
    })
  })

  test("picks up dprint.json changes on the next format", async () => {
    let config = dprintConfig({
      typescript: { quoteStyle: "alwaysSingle" },
      plugins: [TS],
    })
    const formatter = makeDprint({ config: () => config })
    await formatter.format("a.ts", "x")
    config = dprintConfig({
      typescript: { quoteStyle: "alwaysDouble" },
      plugins: [TS],
    })
    assert.deepStrictEqual(await formatter.format("a.ts", "x"), {
      _tag: "Formatted",
      text: "alwaysDouble|undefined|x",
    })
  })

  test("a plugin that fails to download fails the format and is retried next time", async () => {
    let attempts = 0
    const formatter = makeDprint({
      config: () => dprintConfig({ plugins: [TS] }),
      load: (plugin) => {
        attempts++
        return attempts === 1
          ? Promise.reject(new Error("network down"))
          : Promise.resolve(fakePlugin(plugins[plugin]!))
      },
    })
    const first = await formatter.format("a.ts", "x")
    assert.deepStrictEqual(first, { _tag: "Failed", message: "network down" })
    const second = await formatter.format("a.ts", "x")
    assert.strictEqual(second._tag, "Formatted")
  })

  test("fails without a usable dprint.json or a plugin for the file", async () => {
    const cases: ReadonlyArray<[string | undefined, string]> = [
      [undefined, "a.ts"],
      ["{ not json", "a.ts"],
      [dprintConfig({ typescript: {} }), "a.ts"],
      [dprintConfig({ typescript: { bogus: true }, plugins: [TS] }), "a.ts"],
      [dprintConfig({ plugins: [TS] }), "README.md"],
    ]
    const results = []
    for (const [config, path] of cases) {
      const formatter = makeDprint({ config: () => config })
      results.push((await formatter.format(path, "x"))._tag)
    }
    assert.deepStrictEqual(results, Array(cases.length).fill("Failed"))
  })

  test("a syntax error the plugin throws on fails the format", async () => {
    const formatter = makeDprint({
      config: () => dprintConfig({ plugins: [TS] }),
      load: () =>
        Promise.resolve(
          fakePlugin({
            configKey: "typescript",
            extensions: ["ts"],
            format: () => {
              throw new Error("Expected '}'")
            },
          }),
        ),
    })
    const result = await formatter.format("a.ts", "{")
    assert.strictEqual(result._tag, "Failed")
    assert.include(
      result._tag === "Failed" ? result.message : "",
      "Expected '}'",
    )
  })
})
