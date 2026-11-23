import { RegistryProvider, useAtomValue } from "@effect/atom-react"
import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import { WorkspaceCompression } from "@/features/share/compression"
import { ShortenClient } from "@/features/share/shorten/client"
import { loadScratchpadWorkspace } from "./load.ts"
import { Scratchpad } from "./Scratchpad.tsx"

const loadRuntime = Atom.runtime(
  Layer.mergeAll(
    ShortenClient.layer,
    WorkspaceCompression.layer,
    BrowserKeyValueStore.layerLocalStorage,
  ),
)

/** Read once per page load: later hash or query changes don't reload. */
const loadedWorkspaceAtom = loadRuntime
  .atom(
    Effect.suspend(() =>
      loadScratchpadWorkspace({
        hash: window.location.hash,
        search: window.location.search,
      }),
    ),
  )
  .pipe(Atom.keepAlive)

function LoadedScratchpad() {
  const result = useAtomValue(loadedWorkspaceAtom)
  if (AsyncResult.isSuccess(result)) {
    const loaded = result.value
    return (
      <Scratchpad
        initialFiles={loaded.files}
        entryPath={loaded.initialFilePath}
        metadata={loaded.metadata}
        notice={loaded.notice}
      />
    )
  }
  if (AsyncResult.isFailure(result)) {
    // Every source falls through to the seed, so this only follows a defect
    // in the loader itself.
    return <Scratchpad />
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-white font-mono text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
      Loading Scratchpad…
    </div>
  )
}

/**
 * The `/scratchpad` page: picks the initial Workspace (Share, `?code=`,
 * autosave or seed) and then mounts the Scratchpad with it.
 */
export function ScratchpadPage() {
  return (
    <RegistryProvider>
      <LoadedScratchpad />
    </RegistryProvider>
  )
}
