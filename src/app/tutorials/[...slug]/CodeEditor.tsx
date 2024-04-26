import { FileWithContent, Workspace } from "@/services/WebContainer"
import { Result, Rx, useRx, useRxSet, useRxValue } from "@effect-rx/rx-react"
import Editor from "@monaco-editor/react"
import { workspaceRx } from "./rx"
import React, { useEffect, useRef } from "react"
import "xterm/css/xterm.css"

const selectedFile = Rx.make(0)

const WorkspaceContext = React.createContext<Workspace>(null as any)

const useFiles = () => {
  const workspace = React.useContext(WorkspaceContext)
  const result = useRxValue(workspaceRx(workspace).files)
  return Result.isSuccess(result) ? result.value : []
}

export function CodeEditor({ workspace }: { workspace: Workspace }) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="flex flex-col h-full w-full">
        <div className="h-2/3">
          <TabBar />
          <FileEditors />
        </div>
        <div className="h-1/3">
          <Terminal workspace={workspace} />
        </div>
      </div>
    </WorkspaceContext.Provider>
  )
}

function TabBar() {
  const files = useFiles()
  const [selected, setSelected] = useRx(selectedFile)

  return (
    <nav className="flex pt-2 pl-2 pb-1 gap-2">
      {files.map(([file], index) => (
        <button
          key={file.file}
          onClick={() => setSelected(index)}
          className={`border-b-2 ${
            index === selected ? "border-blue-600" : "border-transparent"
          } font-bold px-1 text-sm`}
        >
          {file.file}
        </button>
      ))}
    </nav>
  )
}

function FileEditors() {
  const files = useFiles()
  const selected = useRxValue(selectedFile)
  return files.map(([file, write], index) => (
    <div
      key={file.file}
      className={`${index === selected ? "" : "hidden"} h-full w-full`}
    >
      <FileEditor file={file} write={write} />
    </div>
  ))
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
    <Editor
      height="100%"
      theme="vs-dark"
      path={file.file}
      defaultValue={file.initialContent}
      defaultLanguage="typescript"
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
