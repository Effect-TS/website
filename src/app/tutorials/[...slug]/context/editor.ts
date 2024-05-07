import React from "react"
import { EditorHandle } from "../rx/editor"

export const EditorContext = React.createContext<EditorHandle>(null as any)

export const useEditor = () => {
  return React.useContext(EditorContext)
}
