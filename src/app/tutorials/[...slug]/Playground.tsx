import React, { useRef, useState } from "react"
import { setupTypeAcquisition } from "@typescript/ata"
import { type editor as Editor, type languages as Languages } from "monaco-editor"
import { CodeEditor } from "./CodeEditor"
import { Workspace } from "@/services/WebContainer"
import { WorkspaceContext } from "./context"

type MonacoEditor = typeof import("monaco-editor")

export declare namespace Playground {
  export interface Props {
    readonly workspace: Workspace
    readonly tsconfig?: Languages.typescript.CompilerOptions
  }
}

export const Playground: React.FC<Playground.Props> = ({
  workspace,
  tsconfig = {}
}) => {
  const [value, setvalue] = useState(`import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

const program = Effect.gen(function*() {
  const message = yield* Effect.succeed("Hello, World!")
  yield* Console.log(message)
})

Effect.runFork(program)

declare const createStreetLight: <C extends string>(
  colors: C[],
  defaultColor?: NoInfer<C>
) => void

createStreetLight(["red", "yellow", "green"], "blue")`)
  const [file, setFile] = useState("index.ts")
  const monacoRef = useRef<MonacoEditor>();
  const editorRef = useRef<Editor.IStandaloneCodeEditor>()

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="flex flex-col">
        <CodeEditor
          defaultPath={file}
          path={file}
          value={value}
          onMount={async (editor, monaco) => {
            editorRef.current = editor
            monacoRef.current = monaco

            monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

            const ata = setupTypeAcquisition({
              projectName: "Effect Playground",
              typescript: (window as any).ts,
              delegate: {
                // NOTE: Types acquired for a file are cached, so the `receivedFile`
                // delegate will not execute if you comment out an import in the file
                // and then uncomment it
                receivedFile: (code: string, _path: string) => {
                  const path = `file://${_path}`
                  // const uri = monacoRef.current.Uri.parse(path)
                  // const model = monacoRef.current.editor.getModel(uri)
                  // if (!model) {
                  // console.log(`[ATA] Adding ${path} to runtime`, { code })
                  monaco.languages.typescript.typescriptDefaults.addExtraLib(code, path)
                  // }
                },
                // started: () => {
                //   console.log("[ATA]: Beginning automatic type acquisition...")
                // },
                // errorMessage: (message) => {
                //   console.error(message)
                // },
                // finished: () => {
                //   console.log("[ATA]: Finished automatic type acquisition")
                // }
              }
            })

            // Acquire initial types
            const model = monaco.editor.getModel(monaco.Uri.parse(file))!
            const code = model.getValue()
            ata(code)

            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
              allowNonTsExtensions: true,
              strict: true,
              target: monaco.languages.typescript.ScriptTarget.ESNext,
              strictNullChecks: true,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              allowSyntheticDefaultImports: true,
              outDir: "lib", // kills the override input file error
              ...tsconfig,
            })
          }}
          // onChange={async (value) => {
          //   const code = value || ""
          //   debouncedAta(code)
          // }}
        />
      </div>
    </WorkspaceContext.Provider>
  )
}

Playground.displayName = "Playground"