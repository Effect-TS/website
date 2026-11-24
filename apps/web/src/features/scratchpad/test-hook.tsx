/**
 * A development-only hook for the real-Container e2e suite
 * (`test/e2e/scratchpad-container.spec.ts`). It exposes the host spawn API
 * on `window.__scratchpadTest` so a test can run commands (`pnpm add <pkg>`,
 * `echo … > src/extra.ts`) in the Container the way a terminal will. The
 * two-way sync pulls their changes back. `install` starts a page
 * install cycle.
 *
 * `Scratchpad.tsx` only renders `ScratchpadTestHook` when
 * `import.meta.env.DEV` is true (`astro dev`, which is what the e2e configs
 * run), and imports it lazily inside that branch, so production builds
 * contain neither this module nor the global.
 */
import { useAtomSet } from "@effect/atom-react"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Atom from "effect/reactivity/Atom"
import * as Stream from "effect/Stream"
import * as React from "react"
import { Container } from "./container.ts"
import { useScratchpadSession } from "./context.tsx"
import { Dependencies } from "./dependencies.ts"
import type { ScratchpadEditorSession } from "./editor.ts"

export interface ScratchpadTestSpawnInput {
  readonly command: string
  readonly args?: ReadonlyArray<string> | undefined
}

export interface ScratchpadTestSpawnResult {
  readonly exitCode: number
  /** Terminal output (stdout and stderr), ANSI included. */
  readonly output: string
}

export interface ScratchpadTestHook {
  /** Runs a command in the Container's Workspace dir and waits for it to exit. */
  readonly spawn: (
    command: string,
    args?: ReadonlyArray<string>,
  ) => Promise<ScratchpadTestSpawnResult>
  /** Starts an install cycle (`Dependencies.install`): install, sync-back, types. */
  readonly install: () => Promise<void>
}

declare global {
  interface Window {
    __scratchpadTest?: ScratchpadTestHook | undefined
  }
}

export interface ScratchpadTestHookAtoms {
  readonly spawnAtom: Atom.AtomResultFn<
    ScratchpadTestSpawnInput,
    ScratchpadTestSpawnResult,
    unknown
  >
  readonly installAtom: Atom.AtomResultFn<void, void, unknown>
}

export const makeScratchpadTestHookAtoms = <R, ER>(
  runtime: Atom.AtomRuntime<R, ER>,
): ScratchpadTestHookAtoms => ({
  spawnAtom: runtime.fn<ScratchpadTestSpawnInput>()(
    Effect.fnUntraced(function* ({ command, args }) {
      const container = yield* Effect.serviceOption(Container)
      if (Option.isNone(container)) {
        return yield* Effect.die(new Error("The Scratchpad has no Container"))
      }
      return yield* Effect.scoped(
        Effect.gen(function* () {
          const process = yield* container.value.spawn({ command, args })
          const output = yield* process.output.pipe(Stream.mkString)
          const exitCode = yield* process.exitCode
          return { exitCode, output } satisfies ScratchpadTestSpawnResult
        }),
      )
    }),
  ),
  installAtom: runtime.fn<void>()(
    Effect.fnUntraced(function* () {
      const deps = yield* Effect.serviceOption(Dependencies)
      if (Option.isNone(deps)) {
        return yield* Effect.die(
          new Error("The Scratchpad has no Dependencies"),
        )
      }
      yield* deps.value.install
    }),
  ),
})

/** Publishes `window.__scratchpadTest` while mounted. */
export function ScratchpadTestHook({
  runtime,
}: {
  readonly runtime: ScratchpadEditorSession["runtime"]
}) {
  // Keeps the hook inside the session's registry provider.
  useScratchpadSession()
  const [atoms] = React.useState(() => makeScratchpadTestHookAtoms(runtime))
  const spawn = useAtomSet(atoms.spawnAtom, { mode: "promise" })
  const install = useAtomSet(atoms.installAtom, { mode: "promise" })
  React.useEffect(() => {
    const hook: ScratchpadTestHook = {
      spawn: (command, args) => spawn({ command, args }),
      install: () => install(undefined),
    }
    window.__scratchpadTest = hook
    return () => {
      if (window.__scratchpadTest === hook) window.__scratchpadTest = undefined
    }
  }, [spawn, install])
  return null
}

export default ScratchpadTestHook
