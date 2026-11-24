import type { EditorState } from "@codemirror/state"
import { EditorView, type ViewUpdate } from "@codemirror/view"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import { saveAutosave } from "../../../src/features/scratchpad/autosave.ts"
import { SCRATCHPAD_ROOT_URI } from "../../../src/features/scratchpad/config.ts"
import {
  type Container,
  type ContainerBootError,
  ContainerBootFailed,
  type ContainerPhase,
  ContainerUnsupported,
  InstallFailed,
} from "../../../src/features/scratchpad/container.ts"
import {
  type FakeContainerBackend,
  type FakeSpawnCall,
  type FakeSpawnResult,
  layerFakeContainer,
  makeFakeContainerBackend,
} from "./fake-container.ts"
import {
  type EditorViewFactory,
  makeScratchpadEditorSession,
} from "../../../src/features/scratchpad/editor.ts"
import {
  BROWSER_SUPPORT_URL,
  containerFailureOf,
  makeContainerFailureAtoms,
} from "../../../src/features/scratchpad/failure.ts"
import { SCRATCHPAD_AUTOSAVE_KEY } from "../../../src/features/scratchpad/load.ts"
import {
  compressShareWorkspace,
  shareSourceFromSnapshot,
  toShareWorkspace,
} from "../../../src/features/scratchpad/share.ts"
import { makeFakeLspTransport } from "./fake-transport.ts"
import { LspWorkspaceMirror } from "../../../src/features/scratchpad/worker-transport.ts"
import { Workspace } from "../../../src/features/scratchpad/workspace.ts"
import { WorkspaceCompression } from "../../../src/features/share/compression.ts"

describe("containerFailureOf", () => {
  test("a failed boot or install offers Retry; an unsupported browser offers browser-support help instead", () => {
    const strip = (phase: ContainerPhase) => {
      const failure = Option.getOrThrow(containerFailureOf(phase))
      return {
        kind: failure.kind,
        canRetry: failure.canRetry,
        help: failure.helpUrl,
      }
    }
    assert.deepEqual(
      strip({
        _tag: "failed",
        error: new ContainerUnsupported({ message: "no SAB" }),
      }),
      { kind: "unsupported", canRetry: false, help: BROWSER_SUPPORT_URL },
    )
    assert.deepEqual(
      strip({
        _tag: "failed",
        error: new ContainerBootFailed({ message: "boom" }),
      }),
      { kind: "boot-failed", canRetry: true, help: BROWSER_SUPPORT_URL },
    )
    assert.deepEqual(
      strip({
        _tag: "install-failed",
        error: new InstallFailed({
          exitCode: 1,
          outputTail: "ERR_PNPM_FETCH_404",
          message: "pnpm install exited with code 1.",
        }),
      }),
      { kind: "install-failed", canRetry: true, help: undefined },
    )
  })

  test("phases on the way to ready show no strip", () => {
    const phases: Array<ContainerPhase> = [
      { _tag: "booting" },
      { _tag: "installing" },
      { _tag: "loading-types" },
      { _tag: "ready" },
    ]
    for (const phase of phases) {
      assert.isTrue(Option.isNone(containerFailureOf(phase)), phase._tag)
    }
  })
})

// ---------------------------------------------------------------------------
// A Scratchpad session on a fake Container
// ---------------------------------------------------------------------------

const flush = async (ticks = 60) => {
  for (let i = 0; i < ticks; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  for (let i = 0; i < ticks; i++) await Promise.resolve()
}

/** A minimal EditorView stand-in that can type into the document. */
const makeFakeEditors = () => {
  const typers: Array<(text: string) => void> = []
  const factory: EditorViewFactory = ({ state: initial }) => {
    let state = initial
    const view = {
      get state() {
        return state
      },
      hasFocus: false,
      setState(next: EditorState) {
        state = next
      },
      destroy() {},
    } as unknown as EditorView
    typers.push((text) => {
      const tr = state.update({
        changes: { from: 0, to: state.doc.length, insert: text },
      })
      state = tr.state
      for (const listener of state.facet(EditorView.updateListener)) {
        listener({
          view,
          state,
          docChanged: true,
          focusChanged: false,
          transactions: [tr],
        } as unknown as ViewUpdate)
      }
    })
    return view
  }
  return { factory, type: (text: string) => typers.at(-1)!(text) }
}

/** Installs succeed and the collector writes a pack, unless `spawn` says otherwise. */
const makeBackend = (
  spawn?: (call: FakeSpawnCall) => FakeSpawnResult | undefined,
): FakeContainerBackend => {
  const backend: FakeContainerBackend = makeFakeContainerBackend({
    spawn: (call) => {
      const result = spawn?.(call)
      if (result !== undefined) return result
      if (call.command === "node") {
        // The types collector writes its pack where it is told.
        const out = call.args[2]!.split("/").at(-1)!
        backend.hostFiles.set(out, new Uint8Array([1]))
      }
      return { exitCode: 0 }
    },
  })
  return backend
}

const typesMirror = Layer.succeed(LspWorkspaceMirror, {
  apply: () => {},
  readFile: () => Effect.succeed(Option.none()),
  mountTypes: () =>
    Effect.succeed({
      _tag: "TypesMounted" as const,
      id: 1,
      files: 1,
      bytes: 1,
      packages: [],
    }),
}) as Layer.Layer<never>

const setup = async (containerLayer: Layer.Layer<Container>) => {
  const fake = makeFakeLspTransport({ autoHandshake: true })
  const editors = makeFakeEditors()
  const session = makeScratchpadEditorSession({
    transportLayer: Layer.mergeAll(fake.layer, TestClock.layer(), typesMirror),
    rootUri: SCRATCHPAD_ROOT_URI,
    initialFiles: { "package.json": "{}", "src/main.ts": "main" },
    createEditorView: editors.factory,
    containerLayer,
  })
  const failure = makeContainerFailureAtoms({
    runtime: session.runtime,
    containerPhaseAtom: session.containerPhaseAtom,
  })
  const registry = AtomRegistry.make({ defaultIdleTTL: 2000 })
  const unmountEditor = registry.mount(session.editorAtom)
  const unmountFailure = registry.mount(failure.visibleFailureAtom)
  registry.set(
    session.elementAtom,
    Option.some({ replaceChildren() {} } as unknown as HTMLElement),
  )
  await flush()

  const phase = () =>
    Option.map(registry.get(session.containerPhaseAtom), (p) => p._tag)
  const retry = async () => {
    registry.set(failure.retryAtom, undefined)
    await flush()
  }
  const runOnSession = <A>(effect: Effect.Effect<A, unknown, Workspace>) => {
    const atom = session.runtime.atom(effect)
    return new Promise<A>((resolve, reject) => {
      const unmount = registry.subscribe(
        atom,
        (result) => {
          if (result._tag === "Success") {
            unmount()
            resolve(result.value)
          } else if (result._tag === "Failure") {
            unmount()
            reject(result.cause)
          }
        },
        { immediate: true },
      )
    })
  }

  /** Editing still works: the edit reaches the Workspace, and share and autosave read it. */
  const assertEditable = async (text: string) => {
    editors.type(text)
    await flush()
    const storage = new Map<string, string>()
    const store = Layer.succeed(
      KeyValueStore.KeyValueStore,
      KeyValueStore.makeStringOnly({
        get: (key) => Effect.sync(() => storage.get(key)),
        set: (key, value) =>
          Effect.sync(() => {
            storage.set(key, value)
          }),
        remove: (key) =>
          Effect.sync(() => {
            storage.delete(key)
          }),
        clear: Effect.sync(() => storage.clear()),
        size: Effect.sync(() => storage.size),
        keys: Effect.sync(() => [...storage.keys()]),
      }),
    )
    const { content, saved, compressed } = await runOnSession(
      Effect.gen(function* () {
        const ws = yield* Workspace
        const content = yield* ws.readFile("src/main.ts")
        const saved = yield* saveAutosave({
          workspace: ws,
          metadata: Effect.succeed(undefined),
          initialFiles: {},
        }).pipe(Effect.provide(store))
        const snapshot = yield* ws.snapshot
        const compressed = yield* compressShareWorkspace(
          toShareWorkspace(shareSourceFromSnapshot(snapshot, undefined)),
        ).pipe(Effect.provide(WorkspaceCompression.layer))
        return { content, saved, compressed }
      }),
    )
    assert.equal(content, text)
    assert.isTrue(saved)
    assert.include(storage.get(SCRATCHPAD_AUTOSAVE_KEY) ?? "", text)
    assert.isAbove(compressed.length, 0)
  }

  return {
    session,
    failure,
    registry,
    phase,
    retry,
    assertEditable,
    dispose: () => {
      unmountFailure()
      unmountEditor()
      registry.dispose()
    },
  }
}

const failOnce = (
  error: ContainerBootError,
): {
  readonly boot: Effect.Effect<void, ContainerBootError>
  readonly attempts: () => number
} => {
  let attempts = 0
  return {
    boot: Effect.suspend(() =>
      ++attempts === 1 ? Effect.fail(error) : Effect.void,
    ),
    attempts: () => attempts,
  }
}

describe("Container failures in a Scratchpad session", () => {
  test("boot failed → Retry boots again without a reload and reaches ready; editing, share and autosave work throughout", async () => {
    const backend = makeBackend()
    const boot = failOnce(new ContainerBootFailed({ message: "boom" }))
    const ctx = await setup(layerFakeContainer(backend, boot.boot))
    try {
      assert.deepEqual(ctx.phase(), Option.some("failed"))
      const failure = Option.getOrThrow(
        ctx.registry.get(ctx.failure.visibleFailureAtom),
      )
      assert.equal(failure.kind, "boot-failed")
      await ctx.assertEditable("edited while failed")
      assert.equal(backend.log.length, 0)

      await ctx.retry()
      assert.equal(boot.attempts(), 2)
      assert.deepEqual(ctx.phase(), Option.some("ready"))
      assert.isTrue(Option.isNone(ctx.registry.get(ctx.failure.failureAtom)))
      // The remount carries the edit made while the Container was down.
      assert.equal(backend.files.get("src/main.ts"), "edited while failed")
      await ctx.assertEditable("edited after retry")
      assert.equal(backend.files.get("src/main.ts"), "edited after retry")
    } finally {
      ctx.dispose()
    }
  })

  test("install failed → Retry installs again and reaches ready; editing, share and autosave work throughout", async () => {
    let installs = 0
    const backend = makeBackend((call) =>
      call.command === "pnpm" && ++installs === 1
        ? { exitCode: 1, output: ["ERR_PNPM_FETCH_404\n"] }
        : undefined,
    )
    const ctx = await setup(layerFakeContainer(backend))
    try {
      assert.deepEqual(ctx.phase(), Option.some("install-failed"))
      const failure = Option.getOrThrow(
        ctx.registry.get(ctx.failure.visibleFailureAtom),
      )
      assert.equal(failure.kind, "install-failed")
      // The pnpm output is there for the output panel to print.
      assert.equal(
        ctx.registry.get(ctx.session.installLogAtom).output,
        "ERR_PNPM_FETCH_404\n",
      )
      await ctx.assertEditable("edited while install failed")

      await ctx.retry()
      assert.equal(installs, 2)
      assert.deepEqual(ctx.phase(), Option.some("ready"))
      assert.isTrue(Option.isNone(ctx.registry.get(ctx.failure.failureAtom)))
      await ctx.assertEditable("edited after retry")
    } finally {
      ctx.dispose()
    }
  })

  test("an unsupported browser offers no Retry, and retrying anyway does nothing; editing works", async () => {
    const backend = makeBackend()
    const boot = failOnce(new ContainerUnsupported({ message: "no SAB" }))
    const ctx = await setup(layerFakeContainer(backend, boot.boot))
    try {
      assert.isTrue(
        Option.isSome(ctx.registry.get(ctx.failure.visibleFailureAtom)),
      )
      await ctx.retry()
      assert.equal(boot.attempts(), 1)
      assert.deepEqual(ctx.phase(), Option.some("failed"))
      await ctx.assertEditable("edited without a runtime")
    } finally {
      ctx.dispose()
    }
  })

  test("a dismissed strip comes back when asked (the badge), and a new failure shows again", async () => {
    let installs = 0
    const backend = makeBackend((call) =>
      call.command === "pnpm" && ++installs <= 2
        ? { exitCode: 1, output: [`attempt ${installs}\n`] }
        : undefined,
    )
    const ctx = await setup(layerFakeContainer(backend))
    try {
      const failure = Option.getOrThrow(
        ctx.registry.get(ctx.failure.failureAtom),
      )
      ctx.registry.set(
        ctx.failure.dismissedFailureAtom,
        Option.some(failure.error),
      )
      assert.isTrue(
        Option.isNone(ctx.registry.get(ctx.failure.visibleFailureAtom)),
      )
      assert.isTrue(Option.isSome(ctx.registry.get(ctx.failure.failureAtom)))

      // The badge's "show".
      ctx.registry.set(ctx.failure.dismissedFailureAtom, Option.none())
      assert.isTrue(
        Option.isSome(ctx.registry.get(ctx.failure.visibleFailureAtom)),
      )

      // Dismiss, retry, fail again: the new failure is not dismissed.
      ctx.registry.set(
        ctx.failure.dismissedFailureAtom,
        Option.some(failure.error),
      )
      await ctx.retry()
      assert.equal(installs, 2)
      const again = Option.getOrThrow(
        ctx.registry.get(ctx.failure.visibleFailureAtom),
      )
      assert.notStrictEqual(again.error, failure.error)
    } finally {
      ctx.dispose()
    }
  })

  test("dependencies unavailable shows no strip, only an output line", async () => {
    const backend = makeBackend((call) =>
      call.command === "node" ? { exitCode: 1, output: ["boom"] } : undefined,
    )
    const ctx = await setup(layerFakeContainer(backend))
    try {
      assert.deepEqual(ctx.phase(), Option.some("dependencies-unavailable"))
      assert.isTrue(Option.isNone(ctx.registry.get(ctx.failure.failureAtom)))
      const line = Option.getOrThrow(
        ctx.registry.get(ctx.failure.dependenciesUnavailableLineAtom),
      )
      assert.include(line, "Collecting installed types failed")
      await ctx.assertEditable("still editing")
    } finally {
      ctx.dispose()
    }
  })
})
