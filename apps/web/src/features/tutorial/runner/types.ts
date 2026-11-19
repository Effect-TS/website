import type * as Monaco from "@effect/monaco-editor"

const TEST_API_DTS = `
export declare const it: (name: string, run: () => unknown) => void
export declare const assert: {
  ok(value: unknown, message?: string): asserts value
  strictEqual(actual: unknown, expected: unknown, message?: string): void
}
`

let configured = false
let typesLoaded: Promise<void> | undefined

/** Sets compiler options once. Call before the first model is created. */
export function configureTypeScript(monaco: typeof Monaco): void {
  if (configured) return
  configured = true
  const defaults = monaco.languages.typescript.typescriptDefaults
  defaults.setCompilerOptions({
    allowNonTsExtensions: true,
    esModuleInterop: true,
    lib: ["esnext", "dom"],
    module: 99, // ModuleKind.ESNext
    moduleResolution: 100 as never, // ModuleResolutionKind.Bundler
    noEmit: false,
    skipLibCheck: true,
    strict: true,
    target: 99, // ScriptTarget.ESNext
  })
  defaults.setEagerModelSync(true)
}

/** Registers the `effect` type definitions served at build time. */
export function loadTypes(monaco: typeof Monaco): Promise<void> {
  typesLoaded ??= (async () => {
    const response = await fetch("/tutorial/types.json")
    if (!response.ok) throw new Error("Could not load the Effect types")
    const files = (await response.json()) as Readonly<Record<string, string>>
    const defaults = monaco.languages.typescript.typescriptDefaults
    for (const [path, content] of Object.entries(files)) {
      defaults.addExtraLib(content, `file://${path}`)
    }
    defaults.addExtraLib(
      TEST_API_DTS,
      "file:///node_modules/tutorial-test/index.d.ts",
    )
    defaults.addExtraLib(
      JSON.stringify({
        name: "tutorial-test",
        version: "1.0.0",
        types: "./index.d.ts",
      }),
      "file:///node_modules/tutorial-test/package.json",
    )
  })()
  return typesLoaded
}
