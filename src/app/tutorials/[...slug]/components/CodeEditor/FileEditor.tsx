import { useRx } from "@effect-rx/rx-react"
import clsx from "clsx"
import { useEffect, useRef } from "react"
import { EditorContext, editorRx } from "../../rx/editor"
import { useWorkspace } from "../../context/workspace"

export function FileEditor() {
  const workspace = useWorkspace()
  const containerRef = useRef(null)
  const [editor, setContext] = useRx(editorRx)
  useEffect(() => {
    if (containerRef.current) {
      setContext(
        new EditorContext({
          workspace,
          el: containerRef.current
        })
      )
    }
  }, [setContext, containerRef, workspace])

  const isReady = editor._tag === "Success"

  return (
    <section className="h-full flex flex-col">
      {!isReady && (
        <div className="h-full flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-400" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={clsx("flex-grow w-full", !isReady && "hidden")}
      />
    </section>
  )
}

// export const FileEditor2: React.FC<FileEditor.Props> = () => {
//   // TODO: fix all these hacks :)
//   const files = useFiles()
//   const selected = useRxValue(selectedFileRx)
//   return files.length === 0 ? (
//     <div>No files</div>
//   ) : (
//     <MonacoEditor
//       theme="vs-dark"
//       path={files[selected][0].file}
//       defaultPath={files[selected][0].file}
//       defaultValue={files[selected][0].initialContent}
//       defaultLanguage="typescript"
//       onMount={async (editor, monaco) => {
//         monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

//         const ata = setupTypeAcquisition({
//           projectName: "Effect Playground",
//           typescript: (window as any).ts,
//           delegate: {
//             // NOTE: Types acquired for a file are cached, so the `receivedFile`
//             // delegate will not execute if you comment out an import in the file
//             // and then uncomment it
//             receivedFile: (code: string, _path: string) => {
//               const path = `file://${_path}`
//               console.log(`[ATA] Adding ${path} to runtime`, { code })
//               monaco.languages.typescript.typescriptDefaults.addExtraLib(
//                 code,
//                 path
//               )
//             },
//             started: () => {
//               console.log("[ATA]: Beginning automatic type acquisition...")
//             },
//             errorMessage: (message) => {
//               console.error(message)
//             },
//             finished: () => {
//               console.log("[ATA]: Finished automatic type acquisition")
//             }
//           }
//         })

//         // Acquire initial types
//         const model = monaco.editor.getModel(
//           monaco.Uri.parse(files[selected][0].file)
//         )!
//         const code = model.getValue()
//         ata(code)

//         monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
//           allowNonTsExtensions: true,
//           strict: true,
//           target: monaco.languages.typescript.ScriptTarget.ESNext,
//           strictNullChecks: true,
//           moduleResolution:
//             monaco.languages.typescript.ModuleResolutionKind.NodeJs,
//           allowSyntheticDefaultImports: true,
//           outDir: "lib"
//         })
//       }}
//     />
//   )
// }

// FileEditor.displayName = "FileEditor"
