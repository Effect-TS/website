import { language } from "@codemirror/language"
import type { EditorState, TransactionSpec } from "@codemirror/state"
import { EditorView, type ViewUpdate } from "@codemirror/view"
import * as Clock from "effect/Clock"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  applyWorkspaceEdit,
  type LspRange,
} from "../../../src/features/scratchpad/code-actions.ts"
import { SCRATCHPAD_ROOT_URI } from "../../../src/features/scratchpad/config.ts"
import {
  type Container,
  ContainerBootFailed,
} from "../../../src/features/scratchpad/container.ts"
import {
  type EditorViewFactory,
  makeScratchpadEditorSession,
} from "../../../src/features/scratchpad/editor.ts"
import type {
  PageToWorker,
  TypesMountResult,
} from "../../../src/features/scratchpad/worker-protocol.ts"
import {
  layerWorker,
  LspWorkspaceMirror,
} from "../../../src/features/scratchpad/worker-transport.ts"
import {
  layerFakeContainer,
  makeFakeContainerBackend,
} from "./fake-container.ts"
import {
  type FakeLspTransportOptions,
  makeFakeLspTransport,
} from "./fake-transport.ts"
import { makeFakeWorkers } from "./fake-worker.ts"
import { MAIN_SNIPPET } from "./fixtures.ts"

const flushMicrotasks = async (ticks = 15) => {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve()
  }
}

interface FakeEditorViewHandle {
  readonly view: EditorView
  readonly getState: () => EditorState
  readonly emitDocChange: (nextText: string) => void
}

/** EditorView needs a DOM; this stands in with just state and dispatch. */
const createFakeEditorFactory = () => {
  const handles: Array<FakeEditorViewHandle> = []

  const factory: EditorViewFactory = ({ state: initialState }) => {
    let state = initialState

    const notifyListeners = (update: Partial<ViewUpdate>) => {
      for (const listener of state.facet(EditorView.updateListener)) {
        listener(update as ViewUpdate)
      }
    }

    const view = {
      get state() {
        return state
      },
      get hasFocus() {
        return false
      },
      setState(next: EditorState) {
        state = next
      },
      dispatch(spec: TransactionSpec) {
        const tr = state.update(spec)
        state = tr.state
        notifyListeners({
          view,
          state,
          docChanged: tr.docChanged,
          focusChanged: false,
          transactions: [tr],
        })
      },
      destroy() {},
    } as unknown as EditorView

    handles.push({
      view,
      getState: () => state,
      emitDocChange: (nextText: string) =>
        view.dispatch({
          changes: { from: 0, to: state.doc.length, insert: nextText },
        }),
    })

    return view
  }

  return { factory, handles }
}

const fakeElement = { replaceChildren() {} } as unknown as HTMLElement

const setupEditorTest = async (
  fakeOptions?: FakeLspTransportOptions,
  initialFiles?: Readonly<Record<string, string>>,
  containerLayer?: Layer.Layer<Container>,
  mirrorLayer: Layer.Layer<never> = Layer.empty,
) => {
  const fake = makeFakeLspTransport(fakeOptions)
  const layer = Layer.mergeAll(fake.layer, TestClock.layer(), mirrorLayer)
  const fakeEditors = createFakeEditorFactory()

  const session = makeScratchpadEditorSession({
    transportLayer: layer,
    rootUri: SCRATCHPAD_ROOT_URI,
    initialCode: MAIN_SNIPPET,
    initialFiles,
    createEditorView: fakeEditors.factory,
    containerLayer,
  })

  const clockAtom = session.runtime.atom(Clock.Clock)
  const registry = AtomRegistry.make({ defaultIdleTTL: 2000 })
  const unmountClock = registry.mount(clockAtom)

  await flushMicrotasks(15)

  const adjust = async (duration: Duration.Input) => {
    const clock = registry.get(clockAtom)
    if (clock._tag !== "Success") throw new Error("TestClock not ready")
    await Effect.runPromise(
      (clock.value as TestClock.TestClock).adjust(duration),
    )
    await flushMicrotasks(20)
  }

  /** Mounts the editor into the page, as the Scratchpad component does. */
  const mount = async (ticks = 60) => {
    const unmount = registry.mount(session.editorAtom)
    registry.set(session.elementAtom, Option.some(fakeElement))
    await flushMicrotasks(ticks)
    return unmount
  }

  const editor = () => {
    const result = registry.get(session.editorAtom)
    if (result._tag !== "Success") throw new Error(`editor is ${result._tag}`)
    return result.value
  }

  const open = async (path: string) => {
    registry.set(session.openFileAtom, path)
    await flushMicrotasks(40)
    return fakeEditors.handles[0]!.getState()
  }

  return {
    fake,
    fakeEditors,
    session,
    registry,
    adjust,
    mount,
    editor,
    open,
    getStatus: () => registry.get(session.statusAtom),
    dispose: () => {
      unmountClock()
      registry.dispose()
    },
  }
}

type EditorTest = Awaited<ReturnType<typeof setupEditorTest>>

const withEditorTest = async (
  ctx: EditorTest,
  body: (ctx: EditorTest) => Promise<void>,
) => {
  try {
    await body(ctx)
  } finally {
    ctx.dispose()
  }
}

/** A language-server mirror whose types mount when `mountTypes` says. */
const mirror = (options: {
  readonly mountTypes?: () => Effect.Effect<TypesMountResult>
  readonly files?: Readonly<Record<string, string>>
}) =>
  Layer.succeed(LspWorkspaceMirror, {
    apply: () => {},
    readFile: (path: string) =>
      Effect.succeed(Option.fromNullishOr(options.files?.[path])),
    mountTypes: options.mountTypes ?? (() => Effect.never),
  }) as Layer.Layer<never>

/** A Container whose install produces a types pack to mount. */
const backendWithTypes = () => {
  const backend = makeFakeContainerBackend({
    spawn: (call) => {
      if (call.command === "node") {
        backend.hostFiles.set("types.pack", new Uint8Array([1]))
      }
      return {}
    },
  })
  return backend
}

const pushDiagnostic = (ctx: EditorTest, severity: number, message: string) =>
  Effect.runPromise(
    ctx.fake.controller.pushNotification("textDocument/publishDiagnostics", {
      uri: `${SCRATCHPAD_ROOT_URI}/src/main.ts`,
      diagnostics: [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
          severity,
          message,
        },
      ],
    }),
  )

describe("ScratchpadEditorSession", () => {
  test("the editor shows the starting code before the language server is ready", async () => {
    const ctx = await setupEditorTest({ autoHandshake: false })
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount(20)
      assert.deepEqual(
        {
          status: ctx.getStatus(),
          doc: ctx.fakeEditors.handles[0]?.getState().doc.toString(),
        },
        { status: { _tag: "connecting" }, doc: MAIN_SNIPPET },
      )
      unmount()
    })
  })

  test("a remount (React StrictMode) keeps the one language server", async () => {
    const ctx = await setupEditorTest({ autoHandshake: true })
    await withEditorTest(ctx, async () => {
      const unmount1 = await ctx.mount(20)
      ctx.registry.set(ctx.session.elementAtom, Option.none())
      unmount1()
      await flushMicrotasks(20)
      const unmount2 = await ctx.mount(20)
      assert.equal(await Effect.runPromise(ctx.fake.controller.openCount), 1)
      unmount2()
    })
  })

  test("Workspace files and edits reach the Container without waiting for the language server", async () => {
    const backend = makeFakeContainerBackend()
    const ctx = await setupEditorTest(
      { autoHandshake: false },
      { "src/main.ts": "main", "src/util.ts": "util" },
      layerFakeContainer(backend),
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount(40)
      ctx.fakeEditors.handles[0]!.emitDocChange("edited")
      await flushMicrotasks(40)
      assert.deepEqual(Object.fromEntries(backend.files), {
        "src/main.ts": "edited",
        "src/util.ts": "util",
      })
      unmount()
    })
  })

  test("editing keeps working when the Container fails to boot", async () => {
    const backend = makeFakeContainerBackend()
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      { "src/main.ts": "main" },
      layerFakeContainer(
        backend,
        Effect.fail(new ContainerBootFailed({ message: "boom" })),
      ),
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount(40)
      ctx.fakeEditors.handles[0]!.emitDocChange("still editing")
      await flushMicrotasks(40)
      assert.equal(
        await Effect.runPromise(ctx.editor().workspace.readFile("src/main.ts")),
        "still editing",
      )
      unmount()
    })
  })

  test("diagnostics pushed before the installed types mount stay hidden; later ones show", async () => {
    const answer = Deferred.makeUnsafe<TypesMountResult>()
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      { "src/main.ts": "main" },
      layerFakeContainer(backendWithTypes()),
      mirror({ mountTypes: () => Deferred.await(answer) }),
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount()
      await pushDiagnostic(ctx, 1, "Cannot find module 'effect'")
      await flushMicrotasks(40)
      Deferred.doneUnsafe(
        answer,
        Effect.succeed({
          _tag: "TypesMounted",
          id: 1,
          files: 1,
          bytes: 1,
          packages: [],
        }),
      )
      await flushMicrotasks(60)
      const afterMount = ctx.registry.get(ctx.session.diagnosticsAtom).size
      await pushDiagnostic(ctx, 2, "fresh")
      await flushMicrotasks(40)
      assert.deepEqual(
        {
          afterMount,
          fresh: ctx.registry
            .get(ctx.session.diagnosticsAtom)
            .get("src/main.ts"),
        },
        { afterMount: 0, fresh: { errors: 0, warnings: 1 } },
      )
      unmount()
    })
  })

  test("held-back diagnostics show once the types fail to arrive within 60 seconds", async () => {
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      { "src/main.ts": "main" },
      layerFakeContainer(backendWithTypes()),
      mirror({}),
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount()
      await pushDiagnostic(ctx, 2, "warning")
      const shown = () =>
        ctx.registry.get(ctx.session.diagnosticsAtom).get("src/main.ts")
      await ctx.adjust("59 seconds")
      const before = shown()
      await ctx.adjust("1 second")
      await flushMicrotasks(40)
      assert.deepEqual(
        { before, after: shown() },
        { before: undefined, after: { errors: 0, warnings: 1 } },
      )
      unmount()
    })
  })

  test("a Container edit to the open file updates the editor in place, keeping the cursor with its text", async () => {
    const backend = makeFakeContainerBackend()
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      { "src/main.ts": "const a = 1\nconst b = 2\n" },
      layerFakeContainer(backend),
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount()
      const view = ctx.fakeEditors.handles[0]!
      view.view.dispatch({
        selection: { anchor: "const a = 1\nconst b".length },
      })

      backend.containerWrite("src/main.ts", "const alpha = 1\nconst b = 2\n")
      await flushMicrotasks(20)
      await ctx.adjust("100 millis")
      await new Promise((resolve) => setTimeout(resolve, 20))
      await flushMicrotasks(80)

      const state = view.getState()
      const head = state.selection.main.head
      assert.deepEqual(
        {
          doc: state.doc.toString(),
          beforeCursor: state.doc.sliceString(head - 7, head),
        },
        { doc: "const alpha = 1\nconst b = 2\n", beforeCursor: "const b" },
      )
      unmount()
    })
  })

  test("only TypeScript files are opened in the language server", async () => {
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      {
        "src/main.ts": "export const a = 1\n",
        "src/view.tsx": "export const b = 1\n",
        "package.json": "{}\n",
        "README.md": "# hi\n",
      },
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount(40)
      await ctx.open("README.md")
      const opened = (await Effect.runPromise(ctx.fake.controller.sentMessages))
        .filter((m) => "method" in m && m.method === "textDocument/didOpen")
        .map(
          (m) =>
            (m as { params: { textDocument: { uri: string } } }).params
              .textDocument.uri,
        )
      assert.sameMembers(opened, [
        "file:///workspace/src/main.ts",
        "file:///workspace/src/view.tsx",
      ])
      unmount()
    })
  })

  test("each file opens with its language, and package.json and the lockfile read-only", async () => {
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      {
        "src/main.ts": "export const a = 1\n",
        "tsconfig.json": "{}\n",
        "README.md": "# hi\n",
        "package.json": "{}\n",
        "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      },
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount(40)
      const opened: Array<[string, string | undefined, boolean]> = []
      for (const path of [
        "src/main.ts",
        "tsconfig.json",
        "README.md",
        "package.json",
        "pnpm-lock.yaml",
      ]) {
        const state = await ctx.open(path)
        opened.push([path, state.facet(language)?.name, state.readOnly])
      }
      assert.deepEqual(opened, [
        ["src/main.ts", "typescript", false],
        ["tsconfig.json", "json", false],
        ["README.md", undefined, false],
        ["package.json", "json", true],
        ["pnpm-lock.yaml", undefined, true],
      ])
      unmount()
    })
  })

  test("edits in the editor reach the language server worker's file system", async () => {
    const fakes = makeFakeWorkers()
    const fakeEditors = createFakeEditorFactory()
    const session = makeScratchpadEditorSession({
      transportLayer: layerWorker({
        makeWorker: fakes.makeWorker,
        assets: { wasm: { url: "/lsp.wasm" } },
      }),
      rootUri: SCRATCHPAD_ROOT_URI,
      initialFiles: { "src/main.ts": "export const a = 1\n" },
      createEditorView: fakeEditors.factory,
    })
    const registry = AtomRegistry.make({ defaultIdleTTL: 2000 })
    try {
      const unmount = registry.mount(session.editorAtom)
      registry.set(session.elementAtom, Option.some(fakeElement))
      await flushMicrotasks(40)
      fakeEditors.handles[0]!.emitDocChange("export const edited = 1\n")
      await flushMicrotasks(40)
      const lastFsOp = fakes.workers
        .flatMap((w) => w.controls())
        .filter(
          (m): m is Extract<PageToWorker, { _tag: "Fs" }> => m._tag === "Fs",
        )
        .at(-1)?.op
      assert.deepEqual(lastFsOp, {
        _tag: "WriteFile",
        path: "src/main.ts",
        content: "export const edited = 1\n",
      })
      unmount()
    } finally {
      registry.dispose()
    }
  })
})

describe("library files", () => {
  test("go-to-definition into node_modules opens a read-only tab that stays out of the Workspace", async () => {
    const dts = "node_modules/effect/dist/Effect.d.ts"
    const text = "export declare const succeed: <A>(a: A) => A\n"
    const ctx = await setupEditorTest(
      { autoHandshake: true },
      { "src/main.ts": 'import { Effect } from "effect"\n' },
      undefined,
      mirror({ files: { [dts]: text } }),
    )
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount()
      const { client, workspace } = ctx.editor()
      await client.workspace.displayFile(`${SCRATCHPAD_ROOT_URI}/${dts}`)
      await flushMicrotasks(20)
      const state = ctx.fakeEditors.handles[0]!.getState()
      assert.deepEqual(
        {
          tabs: ctx.registry.get(ctx.session.openTabsAtom),
          doc: state.doc.toString(),
          readOnly: state.readOnly,
          workspaceFiles: (await Effect.runPromise(workspace.listFiles)).map(
            (file) => file.path,
          ),
        },
        {
          tabs: ["src/main.ts", dts],
          doc: text,
          readOnly: true,
          workspaceFiles: ["src/main.ts"],
        },
      )
      unmount()
    })
  })
})

describe("applyWorkspaceEdit", () => {
  const files = {
    "src/main.ts": 'import { greet } from "./greeter.ts"\n',
    "src/greeter.ts": "export const greet = 1\n",
    "src/util.ts": "export const util = 1\n",
  }
  const range = (line: number, start: number, end = start): LspRange => ({
    start: { line, character: start },
    end: { line, character: end },
  })

  test("edits reach files that are not in the editor, and their tabs show them", async () => {
    const ctx = await setupEditorTest({ autoHandshake: true }, files)
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount()
      // util.ts has an editor state from being opened before; greeter.ts
      // has never been opened.
      await ctx.open("src/util.ts")
      await ctx.open("src/main.ts")
      applyWorkspaceEdit(ctx.editor().client, {
        changes: {
          [`${SCRATCHPAD_ROOT_URI}/src/greeter.ts`]: [
            { range: range(0, 13, 18), newText: "greetUser" },
          ],
          [`${SCRATCHPAD_ROOT_URI}/src/util.ts`]: [
            { range: range(0, 0), newText: "// fixed\n" },
          ],
        },
      })
      await flushMicrotasks(40)
      const shown = async (path: string) =>
        (await ctx.open(path)).doc.toString()
      assert.deepEqual(
        {
          greeter: await shown("src/greeter.ts"),
          util: await shown("src/util.ts"),
        },
        {
          greeter: "export const greetUser = 1\n",
          util: "// fixed\nexport const util = 1\n",
        },
      )
      unmount()
    })
  })

  test("documentChanges win over changes, and documents outside the Workspace are skipped", async () => {
    const ctx = await setupEditorTest({ autoHandshake: true }, files)
    await withEditorTest(ctx, async () => {
      const unmount = await ctx.mount()
      const { client, workspace } = ctx.editor()
      const result = applyWorkspaceEdit(client, {
        changes: {
          [`${SCRATCHPAD_ROOT_URI}/src/util.ts`]: [
            { range: range(0, 0), newText: "// from changes\n" },
          ],
        },
        documentChanges: [
          {
            textDocument: {
              uri: `${SCRATCHPAD_ROOT_URI}/src/util.ts`,
              version: null,
            },
            edits: [
              { range: range(0, 0), newText: "// from documentChanges\n" },
            ],
          },
          {
            textDocument: {
              uri: `${SCRATCHPAD_ROOT_URI}/node_modules/effect/index.d.ts`,
              version: null,
            },
            edits: [{ range: range(0, 0), newText: "nope" }],
          },
        ],
      })
      await flushMicrotasks(40)
      assert.deepEqual(
        {
          skipped: result.skipped,
          util: await Effect.runPromise(workspace.readFile("src/util.ts")),
        },
        {
          skipped: [`${SCRATCHPAD_ROOT_URI}/node_modules/effect/index.d.ts`],
          util: "// from documentChanges\nexport const util = 1\n",
        },
      )
      unmount()
    })
  })
})
