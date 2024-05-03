import React from "react"
import { useRx } from "@effect-rx/rx-react"
import { useFiles } from "../context/workspace"
import { selectedFileRx } from "../rx/workspace"

declare namespace TabBar {
  export interface Props { }
}

export const TabBar: React.FC<TabBar.Props> = () => {
  const files = useFiles()
  const [selected, setSelected] = useRx(selectedFileRx)

  return (
    <nav className="flex pt-2 pl-2 pb-1 gap-2">
      {files.map(([file], index) => (
        <button
          key={file.file}
          onClick={() => setSelected(index)}
          className={`border-b-2 ${index === selected ? "border-blue-600" : "border-transparent"
            } font-bold px-1 text-sm`}
        >
          {file.file}
        </button>
      ))}
    </nav>
  )
}

TabBar.displayName = "TabBar"
