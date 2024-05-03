import React from "react"
import { useRxSet, Rx } from "@effect-rx/rx-react"
import { setupTypeAcquisition } from "@typescript/ata"
import { FileWithContent } from "@/services/WebContainer"
import { MonacoEditor } from "./MonacoEditor"

declare namespace FileEditor {
  export interface Props {
    readonly file: FileWithContent
    readonly write: Rx.RxResultFn<string, void>
  }
}

export const FileEditor: React.FC<FileEditor.Props> = ({ file, write }) => {
  const setContent = useRxSet(write) // TODO
  return (
    <MonacoEditor
      theme="vs-dark"
      path={file.file}
      defaultValue={file.initialContent}
      defaultLanguage={file.file.endsWith(".json") ? "json" : "typescript"}
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
        const model = monaco.editor.getModel(monaco.Uri.parse(file.file))!
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
