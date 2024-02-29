import { FileWithContent, Workspace } from "@/services/WebContainer"
import { javascript } from "@codemirror/lang-javascript"
import { Result, Rx, useRxSet, useRxValue } from "@effect-rx/rx-react"
import CodeMirror from "@uiw/react-codemirror"
import { atomone } from '@uiw/codemirror-theme-atomone';
import { Checklist } from "@/components/atoms/checklist"
import { workspaceRx } from "./rx"
import { useEffect, useRef } from "react"
import "xterm/css/xterm.css"

export const effectWorkspace = new Workspace({
  name: "effect",
  files: [
    new FileWithContent({
      file: "package.json",
      initialContent: JSON.stringify({
        dependencies: {
          effect: "latest",
          tsx: "latest"
        }
      })
    })
  ],
  filesOfInterest: []
})

export function CodeEditor({ workspace }: { workspace: Workspace }) {
  const result = useRxValue(workspaceRx(workspace).files)
  const files = Result.isSuccess(result) ? result.value : []

  // TODO: Implement tabs
  return (
    <div className="grid grid-cols-2">
      <div>
        <Checklist items={["Tutorial point 1", "Tutorial point 2"]} />
      </div>
      <div className="grid grid-rows-2">
        {files.map(([file, write]) => (
          <FileEditor key={file.file} file={file} write={write} />
        ))}
        <Terminal workspace={workspace} />
      </div>
    </div>
  )
}

function FileEditor({
  file,
  write
}: {
  file: FileWithContent
  write: Rx.RxResultFn<string, void>
}) {
  const setContent = useRxSet(write)
  return (
    <CodeMirror
      value={file.initialContent}
      height="100%"
      theme={atomone}
      extensions={[javascript({ typescript: true })]}
      onChange={(value) => {
        setContent(value)
      }}
    />
  )
}

export function Terminal({ workspace }: { workspace: Workspace }) {
  const terminal = useRxValue(workspaceRx(workspace).terminal)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (Result.isSuccess(terminal)) {
      terminal.value.open(ref.current!)
    }
  }, [terminal])

  return <div ref={ref} id="terminal" className="w-full h-full" />
}
