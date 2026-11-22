import type { LSPClient } from "@codemirror/lsp-client"
import type { EditorView } from "@codemirror/view"
import type * as Option from "effect/Option"
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import type * as Atom from "effect/reactivity/Atom"
import * as React from "react"
import type { LspStatus } from "./session.ts"

export interface ScratchpadSessionContextValue {
  readonly elementAtom: Atom.Writable<Option.Option<HTMLElement>>
  readonly statusAtom: Atom.Writable<LspStatus>
  readonly editorAtom: Atom.Atom<
    AsyncResult.AsyncResult<{
      readonly view: EditorView
      readonly client: LSPClient
    }>
  >
  readonly reconnectAtom: Atom.AtomResultFn<void, void>
}

export const ScratchpadSessionContext =
  React.createContext<ScratchpadSessionContextValue | null>(null)

export const useScratchpadSession = (): ScratchpadSessionContextValue => {
  const ctx = React.useContext(ScratchpadSessionContext)
  if (ctx === null) {
    throw new Error(
      "useScratchpadSession must be used inside a <Scratchpad> component.",
    )
  }
  return ctx
}
