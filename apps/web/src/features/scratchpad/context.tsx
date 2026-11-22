import * as React from "react"
import type { ScratchpadEditorSession } from "./editor.ts"

export type ScratchpadSessionContextValue = Pick<
  ScratchpadEditorSession,
  | "elementAtom"
  | "statusAtom"
  | "editorAtom"
  | "treeAtom"
  | "openTabsAtom"
  | "activeFileAtom"
  | "diagnosticsAtom"
  | "workspaceErrorAtom"
  | "reconnectAtom"
  | "openFileAtom"
  | "closeTabAtom"
  | "createFileAtom"
  | "createDirectoryAtom"
  | "renamePathAtom"
  | "deletePathAtom"
  | "clearErrorAtom"
>

export const ScratchpadSessionContext =
  React.createContext<ScratchpadSessionContextValue | null>(null)

export const useScratchpadSession = (): ScratchpadSessionContextValue => {
  const value = React.useContext(ScratchpadSessionContext)
  if (value === null) {
    throw new Error(
      "useScratchpadSession must be used inside a ScratchpadSessionContext.Provider",
    )
  }
  return value
}
