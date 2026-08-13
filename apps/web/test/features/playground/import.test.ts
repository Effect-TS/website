import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import { assert, test, vi } from "vite-plus/test"

vi.mock("../../../src/features/playground/services/webcontainer.ts", () => {
  class WebContainer extends Context.Service<
    WebContainer,
    { readonly readFileString: () => Effect.Effect<string> }
  >()("test/WebContainer") {
    static readonly layer = Layer.succeed(this, {
      readFileString: () => Effect.succeed(""),
    })
  }
  return { WebContainer }
})
import {
  importAtom,
  makeAutoSaveAtom,
} from "../../../src/features/playground/atoms/import.ts"
import type { AtomWorkspaceHandle } from "../../../src/features/playground/atoms/workspace.ts"
import {
  defaultMainFile,
  makeDefaultWorkspace,
  makeFile,
} from "../../../src/features/playground/domain/workspace.ts"
import { WorkspaceCompression } from "../../../src/features/playground/services/compression.ts"
import { WebContainer } from "../../../src/features/playground/services/webcontainer.ts"

test("legacy unversioned code links import a v3 workspace", async () => {
  const workspace = await importCodeLink("Effect.log('legacy')")

  assert.equal(workspace.effectVersion, "v3")
  assert.equal(
    workspace.findFile("src/main.ts").pipe(Option.getOrThrow)[0].initialContent,
    "Effect.log('legacy')",
  )
})

test("explicit v4 code links import a v4 workspace", async () => {
  const workspace = await importCodeLink("Effect.log('v4')", "v4")

  assert.equal(workspace.effectVersion, "v4")
  assert.equal(
    workspace.findFile("src/main.ts").pipe(Option.getOrThrow)[0].initialContent,
    "Effect.log('v4')",
  )
})

test("autosave identifies a handle by its initial version", async () => {
  const initialWorkspace = makeDefaultWorkspace("v4")
  const liveWorkspace = makeDefaultWorkspace("v3").replaceNode(
    defaultMainFile("v3"),
    makeFile("main.ts", "Effect.log('edited')"),
  )
  const workspaceAtom = Atom.make(liveWorkspace)
  const savedWorkspaceAtom = Atom.make(Option.none<typeof liveWorkspace>())
  const versionOverrideAtom = Atom.make(Option.some("v4" as const))
  const runtime = Atom.context()(
    Layer.mergeAll(
      Layer.succeed(WebContainer, {
        readFileString: () => Effect.succeed(""),
      } as unknown as WebContainer["Service"]),
      Layer.succeed(WorkspaceCompression, {
        snapshot: () => Effect.succeed(liveWorkspace),
      } as unknown as WorkspaceCompression["Service"]),
    ),
  )
  const autoSave = makeAutoSaveAtom({
    runtime,
    versionOverrideAtom,
    autoSaveWorkspaceAtom: savedWorkspaceAtom,
  })
  const handle = {
    initialWorkspace,
    workspaceAtom,
  } as AtomWorkspaceHandle
  const registry = AtomRegistry.make()
  let resolveSaved!: (workspace: typeof liveWorkspace) => void
  const saved = new Promise<typeof liveWorkspace>((resolve) => {
    resolveSaved = resolve
  })
  const unsubscribe = registry.subscribe(savedWorkspaceAtom, (workspace) => {
    if (Option.isSome(workspace)) {
      resolveSaved(workspace.value)
    }
  })

  try {
    await Effect.runPromise(AtomRegistry.getResult(registry, autoSave(handle)))
    const workspace = await Promise.race([
      saved,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Autosave did not persist")), 1_000),
      ),
    ])
    assert.equal(workspace, liveWorkspace)
  } finally {
    unsubscribe()
    registry.dispose()
  }
})

test("autosave rejects a handle whose initial version is no longer selected", async () => {
  const initialWorkspace = makeDefaultWorkspace("v4")
  const liveWorkspace = makeDefaultWorkspace("v3").replaceNode(
    defaultMainFile("v3"),
    makeFile("main.ts", "Effect.log('edited')"),
  )
  const workspaceAtom = Atom.make(liveWorkspace)
  const savedWorkspaceAtom = Atom.make(Option.none<typeof liveWorkspace>())
  const versionOverrideAtom = Atom.make(Option.some("v3" as const))
  let resolveSnapshot!: () => void
  const snapshotTaken = new Promise<void>((resolve) => {
    resolveSnapshot = resolve
  })
  const runtime = Atom.context()(
    Layer.mergeAll(
      Layer.succeed(WebContainer, {
        readFileString: () => Effect.succeed(""),
      } as unknown as WebContainer["Service"]),
      Layer.succeed(WorkspaceCompression, {
        snapshot: () =>
          Effect.sync(() => {
            resolveSnapshot()
            return liveWorkspace
          }),
      } as unknown as WorkspaceCompression["Service"]),
    ),
  )
  const autoSave = makeAutoSaveAtom({
    runtime,
    versionOverrideAtom,
    autoSaveWorkspaceAtom: savedWorkspaceAtom,
  })
  const handle = {
    initialWorkspace,
    workspaceAtom,
  } as AtomWorkspaceHandle
  const registry = AtomRegistry.make()
  let persisted = false
  const unsubscribe = registry.subscribe(savedWorkspaceAtom, (workspace) => {
    persisted ||= Option.isSome(workspace)
  })

  try {
    await Effect.runPromise(AtomRegistry.getResult(registry, autoSave(handle)))
    await Promise.race([
      snapshotTaken,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Autosave did not take a snapshot")),
          1_000,
        ),
      ),
    ])
    await Promise.resolve()
    assert.isFalse(persisted)
    assert.isTrue(Option.isNone(registry.get(savedWorkspaceAtom)))
  } finally {
    unsubscribe()
    registry.dispose()
  }
})

async function importCodeLink(code: string, version?: "v3" | "v4") {
  const search = new URLSearchParams({
    code: Encoding.encodeBase64Url(code),
  })
  if (version !== undefined) {
    search.set("version", version)
  }
  const url = new URL(`https://example.test/play?${search}`)
  const target = new EventTarget()
  const fakeWindow = Object.assign(target, { location: url })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  })
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: url,
  })
  const registry = AtomRegistry.make()

  try {
    return await Effect.runPromise(AtomRegistry.getResult(registry, importAtom))
  } finally {
    registry.dispose()
    Reflect.deleteProperty(globalThis, "window")
    Reflect.deleteProperty(globalThis, "location")
  }
}
