import { RegistryProvider, useAtomMount, useAtomSet } from "@effect/atom-react"
import * as Option from "effect/Option"
import * as React from "react"
import {
  DEFAULT_SCRATCHPAD_SNIPPET,
  resolveLspWsUrl,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "./config.ts"
import {
  ScratchpadSessionContext,
  type ScratchpadSessionContextValue,
  useScratchpadSession,
} from "./context.tsx"
import { makeScratchpadEditorSession } from "./editor.ts"
import { StatusIndicator } from "./StatusIndicator.tsx"
import { layerWebSocket } from "./transport.ts"

export interface ScratchpadProps {
  readonly wsUrl?: string | undefined
  readonly initialCode?: string | undefined
}

function CodeMirrorHost() {
  const { editorAtom, elementAtom } = useScratchpadSession()
  useAtomMount(editorAtom)
  const setElement = useAtomSet(elementAtom)

  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      setElement(Option.fromNullishOr(node))
    },
    [setElement],
  )

  return (
    <div
      ref={ref}
      data-testid="scratchpad-editor"
      className="h-full min-h-0 w-full flex-1 overflow-hidden"
    />
  )
}

export function Scratchpad({ wsUrl, initialCode }: ScratchpadProps) {
  const [session] = React.useState<ScratchpadSessionContextValue>(() => {
    const resolvedUrl = resolveLspWsUrl(
      wsUrl ?? import.meta.env.PUBLIC_LSP_WS_URL,
    )
    const editorSession = makeScratchpadEditorSession({
      transportLayer: layerWebSocket(resolvedUrl),
      rootUri: SCRATCHPAD_ROOT_URI,
      fileUri: SCRATCHPAD_FILE_URI,
      initialCode: initialCode ?? DEFAULT_SCRATCHPAD_SNIPPET,
    })

    return {
      elementAtom: editorSession.elementAtom,
      statusAtom: editorSession.statusAtom,
      editorAtom: editorSession.editorAtom,
      reconnectAtom: editorSession.reconnectAtom,
    }
  })

  return (
    <RegistryProvider defaultIdleTTL={2000}>
      <ScratchpadSessionContext.Provider value={session}>
        <section
          aria-label="Effect TypeScript Scratchpad"
          className="flex h-full min-h-0 w-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                main.ts
              </span>
              <span
                aria-hidden="true"
                className="text-zinc-400 dark:text-zinc-600"
              >
                ·
              </span>
              <span>Effect TypeScript</span>
            </div>
            <StatusIndicator />
          </div>
          <CodeMirrorHost />
        </section>
      </ScratchpadSessionContext.Provider>
    </RegistryProvider>
  )
}
