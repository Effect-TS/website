import { javascript } from "@codemirror/lang-javascript"
import {
  languageServerExtensions,
  type LSPClient,
} from "@codemirror/lsp-client"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import {
  DEFAULT_SCRATCHPAD_SNIPPET,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "./config.ts"
import {
  makeScratchpadSession,
  utf8ByteLength,
  type LspStatus,
  type ScratchpadSessionConfig,
  type WakeTrigger,
} from "./session.ts"
import type { LspTransport } from "./transport.ts"

export type EditorViewFactory = (args: {
  readonly parent: HTMLElement
  readonly state: EditorState
}) => EditorView

export interface OnlineEventTarget {
  readonly addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void
  readonly removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void
}

export interface ScratchpadEditorSessionConfig extends Omit<
  ScratchpadSessionConfig,
  "initialDocBytes" | "lspClientConfig"
> {
  readonly fileUri?: string | undefined
  readonly initialCode?: string | undefined
  readonly createEditorView?: EditorViewFactory | undefined
  readonly onlineTarget?: OnlineEventTarget | null | undefined
}

export interface ScratchpadEditorInstance {
  readonly view: EditorView
  readonly client: LSPClient
}

export interface ScratchpadEditorSession {
  readonly runtime: Atom.AtomRuntime<LspTransport>
  readonly elementAtom: Atom.Writable<Option.Option<HTMLElement>>
  readonly statusAtom: Atom.Writable<LspStatus>
  readonly editorAtom: Atom.Atom<
    AsyncResult.AsyncResult<ScratchpadEditorInstance>
  >
  readonly reconnectAtom: Atom.AtomResultFn<void, void>
  readonly wakeAtom: Atom.AtomResultFn<WakeTrigger, void>
  readonly onlineAtom: Atom.AtomResultFn<void, void>
  readonly documentChangedAtom: Atom.AtomResultFn<string | number, void>
}

const scratchpadEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily:
      "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "16px 0",
    caretColor: "currentColor",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid color-mix(in oklab, currentColor 12%, transparent)",
    color: "color-mix(in oklab, currentColor 45%, transparent)",
    paddingRight: "4px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in oklab, currentColor 6%, transparent)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in oklab, currentColor 4%, transparent)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-tooltip": {
    borderRadius: "6px",
    border: "1px solid color-mix(in oklab, currentColor 18%, transparent)",
    fontSize: "13px",
  },
})

const defaultEditorViewFactory: EditorViewFactory = ({ parent, state }) =>
  new EditorView({ parent, state })

export const makeScratchpadEditorSession = (
  config: ScratchpadEditorSessionConfig,
): ScratchpadEditorSession => {
  const rootUri = config.rootUri ?? SCRATCHPAD_ROOT_URI
  const fileUri = config.fileUri ?? SCRATCHPAD_FILE_URI
  const initialCode = config.initialCode ?? DEFAULT_SCRATCHPAD_SNIPPET
  const createEditorView = config.createEditorView ?? defaultEditorViewFactory

  const session = makeScratchpadSession({
    ...config,
    rootUri,
    initialDocBytes: utf8ByteLength(initialCode),
    lspClientConfig: {
      extensions: languageServerExtensions(),
    },
  })

  const elementAtom = Atom.make(Option.none<HTMLElement>())

  const editorAtom = session.runtime.atom(
    Effect.fnUntraced(function* (get) {
      const registry = yield* AtomRegistry.AtomRegistry
      const el = yield* get.some(elementAtom)
      const client = yield* get.result(session.clientAtom)

      const onlineTarget =
        config.onlineTarget !== undefined
          ? config.onlineTarget
          : typeof window !== "undefined"
            ? window
            : null

      if (onlineTarget !== null) {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const onOnline = () => {
              registry.set(session.onlineAtom, undefined)
            }
            onlineTarget.addEventListener("online", onOnline)
            return onOnline
          }),
          (onOnline) =>
            Effect.sync(() => {
              onlineTarget.removeEventListener("online", onOnline)
            }),
        )
      }

      const view = yield* Effect.acquireRelease(
        Effect.sync(() => {
          el.replaceChildren()

          const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              registry.set(
                session.documentChangedAtom,
                update.state.doc.toString(),
              )
            }
            if (update.focusChanged && update.view.hasFocus) {
              registry.set(session.wakeAtom, "focus")
            }
          })

          const state = EditorState.create({
            doc: initialCode,
            extensions: [
              basicSetup,
              javascript({ typescript: true }),
              client.plugin(fileUri, "typescript"),
              updateListener,
              scratchpadEditorTheme,
            ],
          })

          return createEditorView({ parent: el, state })
        }),
        (v) =>
          Effect.sync(() => {
            v.destroy()
          }),
      )

      return { view, client } as const
    }),
  )

  return {
    runtime: session.runtime,
    elementAtom,
    statusAtom: session.statusAtom,
    editorAtom,
    reconnectAtom: session.reconnectAtom,
    wakeAtom: session.wakeAtom,
    onlineAtom: session.onlineAtom,
    documentChangedAtom: session.documentChangedAtom,
  }
}
