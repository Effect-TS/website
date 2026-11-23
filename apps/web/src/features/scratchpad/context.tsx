import type * as Atom from "effect/reactivity/Atom"
import * as React from "react"
import type { FlatWorkspaceMetadata } from "@/features/share/flat"
import type { ScratchpadEditorSession } from "./editor.ts"
import type { ContainerFailureAtoms } from "./failure.ts"
import type { ScratchpadShareAtoms } from "./share-atoms.ts"

export type ScratchpadSessionContextValue = Pick<
  ScratchpadEditorSession,
  | "elementAtom"
  | "statusAtom"
  | "containerPhaseAtom"
  | "installLogAtom"
  | "runStateAtom"
  | "runOutputAtom"
  | "stopRunAtom"
  | "restartRunAtom"
  | "revealPositionAtom"
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
> &
  ScratchpadShareAtoms &
  ContainerFailureAtoms & {
    /**
     * Share-format metadata of the loaded Workspace (name, `initialFilePath`,
     * `prepare`, `shells`, `snapshots`, per-node `userManaged`), handed to
     * `fromFlatWorkspace` when sharing. `undefined` when the Workspace never
     * came from the share format.
     */
    readonly workspaceMetadataAtom: Atom.Writable<
      FlatWorkspaceMetadata | undefined
    >
  }

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
