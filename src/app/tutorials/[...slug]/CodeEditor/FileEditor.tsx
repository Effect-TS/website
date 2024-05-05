import React, { useEffect, useState } from "react"
import { useRxSet, useRxValue, Rx } from "@effect-rx/rx-react"
import { setupTypeAcquisition } from "@typescript/ata"
import { FileWithContent } from "@/services/WebContainer"
import { useFiles } from "../context/workspace"
import { selectedFileRx } from "../rx/workspace"
import { MonacoEditor } from "./MonacoEditor"

declare namespace FileEditor {
  export interface Props {
    // readonly file: FileWithContent
    // readonly write: Rx.RxResultFn<string, void>
  }
}

export const FileEditor: React.FC<FileEditor.Props> = () => {
  const files = useFiles()
  const selected = useRxValue(selectedFileRx)
  console.log(files)

  // const [file, write] = files[selected]
  // const setContent = useRxSet(write) // TODO
  return files.length === 0
    ? <div>No files</div>
    : (
      <MonacoEditor
        theme="vs-dark"
        path={files[selected][0].file}
        defaultPath={files[selected][0].file}
        defaultValue={files[selected][0].initialContent}
        defaultLanguage="typescript"
        onMount={async (editor, monaco) => {
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
                console.log(`[ATA] Adding ${path} to runtime`, { code })
                monaco.languages.typescript.typescriptDefaults.addExtraLib(code, path)
              },
              started: () => {
                console.log("[ATA]: Beginning automatic type acquisition...")
              },
              errorMessage: (message) => {
                console.error(message)
              },
              finished: () => {
                console.log("[ATA]: Finished automatic type acquisition")
              }
            }
          })

          // Acquire initial types
          const model = monaco.editor.getModel(monaco.Uri.parse(files[selected][0].file))!
          const code = model.getValue()
          ata(code)

          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            allowNonTsExtensions: true,
            strict: true,
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            strictNullChecks: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            allowSyntheticDefaultImports: true,
            outDir: "lib"
          })
        }}
      />
    )
}

FileEditor.displayName = "FileEditor"
