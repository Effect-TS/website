import type { EditorState } from "@codemirror/state"
import { EditorView, type ViewUpdate } from "@codemirror/view"
import * as Clock from "effect/Clock"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  DEFAULT_SCRATCHPAD_SNIPPET,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "../../../src/features/scratchpad/config.ts"
import {
  makeScratchpadEditorSession,
  type EditorViewFactory,
} from "../../../src/features/scratchpad/editor.ts"
import { MAX_DOC_BYTES } from "../../../src/features/scratchpad/session.ts"
import {
  makeFakeLspTransport,
  type FakeLspTransportOptions,
} from "../../../src/features/scratchpad/transport.ts"

const flushMicrotasks = async (ticks = 15) => {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve()
  }
}

interface FakeEditorViewHandle {
  readonly view: EditorView
  readonly parent: HTMLElement
  readonly getState: () => EditorState
  readonly isDestroyed: () => boolean
  readonly emitDocChange: (nextText: string) => void
  readonly emitFocus: () => void
}

const createFakeEditorFactory = () => {
  const handles: Array<FakeEditorViewHandle> = []

  const factory: EditorViewFactory = ({ parent, state: initialState }) => {
    let state = initialState
    let destroyed = false
    let hasFocus = false

    const view = {
      get state() {
        return state
      },
      get hasFocus() {
        return hasFocus
      },
      destroy() {
        destroyed = true
      },
    } as unknown as EditorView

    const notifyListeners = (update: Partial<ViewUpdate>) => {
      for (const listener of state.facet(EditorView.updateListener)) {
        listener(update as ViewUpdate)
      }
    }

    handles.push({
      view,
      parent,
      getState: () => state,
      isDestroyed: () => destroyed,
      emitDocChange: (nextText: string) => {
        const tr = state.update({
          changes: { from: 0, to: state.doc.length, insert: nextText },
        })
        state = tr.state
        notifyListeners({
          view,
          state,
          docChanged: true,
          focusChanged: false,
          transactions: [tr],
        })
      },
      emitFocus: () => {
        hasFocus = true
        notifyListeners({
          view,
          state,
          docChanged: false,
          focusChanged: true,
          transactions: [],
        })
      },
    })

    return view
  }

  return { factory, handles }
}

const setupEditorTest = async (fakeOptions?: FakeLspTransportOptions) => {
  const fake = makeFakeLspTransport(fakeOptions)
  const layer = Layer.merge(fake.layer, TestClock.layer())
  const fakeEditors = createFakeEditorFactory()
  const onlineTarget = new EventTarget()
  const fakeElement = {
    replaceChildren() {},
  } as unknown as HTMLElement

  const session = makeScratchpadEditorSession({
    transportLayer: layer,
    rootUri: SCRATCHPAD_ROOT_URI,
    fileUri: SCRATCHPAD_FILE_URI,
    initialCode: DEFAULT_SCRATCHPAD_SNIPPET,
    createEditorView: fakeEditors.factory,
    onlineTarget,
  })

  const clockAtom = session.runtime.atom(Clock.Clock)
  const registry = AtomRegistry.make({ defaultIdleTTL: 2000 })
  const unmountClock = registry.mount(clockAtom)

  await flushMicrotasks(15)

  const getTestClock = (): TestClock.TestClock => {
    const res = registry.get(clockAtom)
    if (res._tag !== "Success") {
      throw new Error(`Expected TestClock to be ready, got ${res._tag}`)
    }
    return res.value as TestClock.TestClock
  }

  const adjust = async (duration: Duration.Input) => {
    await Effect.runPromise(getTestClock().adjust(duration))
    await flushMicrotasks(20)
  }

  return {
    fake,
    fakeEditors,
    onlineTarget,
    fakeElement,
    session,
    registry,
    adjust,
    getStatus: () => registry.get(session.statusAtom),
    dispose: () => {
      unmountClock()
      registry.dispose()
    },
  }
}

describe("ScratchpadEditorSession", () => {
  test("mounts EditorView immediately with preloaded snippet before WebSocket initialize finishes", async () => {
    const ctx = await setupEditorTest({ autoHandshake: false })
    try {
      const unmountEditor = ctx.registry.mount(ctx.session.editorAtom)
      ctx.registry.set(ctx.session.elementAtom, Option.some(ctx.fakeElement))
      await flushMicrotasks(20)

      // LSP initialize has not been replied to yet, so status is still connecting.
      assert.deepEqual(ctx.getStatus(), { _tag: "connecting" })

      // EditorView is already mounted with the preloaded Effect snippet.
      assert.equal(ctx.fakeEditors.handles.length, 1)
      const editor = ctx.fakeEditors.handles[0]!
      assert.equal(editor.getState().doc.toString(), DEFAULT_SCRATCHPAD_SNIPPET)
      assert.equal(editor.isDestroyed(), false)

      // Now finish LSP initialize -> ready.
      const initReq = await Effect.runPromise(
        ctx.fake.controller.waitForRequest("initialize"),
      )
      await Effect.runPromise(ctx.fake.controller.replyToInitialize(initReq.id))
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      unmountEditor()
    } finally {
      ctx.dispose()
    }
  })

  test("React.StrictMode double-mount opens a single socket and final dispose tears down cleanly", async () => {
    const ctx = await setupEditorTest({ autoHandshake: true })
    try {
      // Mount 1
      const unmount1 = ctx.registry.mount(ctx.session.editorAtom)
      ctx.registry.set(ctx.session.elementAtom, Option.some(ctx.fakeElement))
      await flushMicrotasks(20)

      assert.equal(ctx.fakeEditors.handles.length, 1)
      assert.equal(await Effect.runPromise(ctx.fake.controller.openCount), 1)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      // StrictMode simulated unmount (ref(null) + unmount)
      ctx.registry.set(ctx.session.elementAtom, Option.none())
      unmount1()
      await flushMicrotasks(20)

      // First EditorView is destroyed cleanly.
      assert.equal(ctx.fakeEditors.handles[0]!.isDestroyed(), true)

      // StrictMode simulated immediate remount within defaultIdleTTL (2000ms)
      const unmount2 = ctx.registry.mount(ctx.session.editorAtom)
      ctx.registry.set(ctx.session.elementAtom, Option.some(ctx.fakeElement))
      await flushMicrotasks(20)

      // Still only a single WebSocket was opened!
      assert.equal(await Effect.runPromise(ctx.fake.controller.openCount), 1)
      assert.equal(ctx.fakeEditors.handles.length, 2)
      assert.equal(ctx.fakeEditors.handles[1]!.isDestroyed(), false)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      // Real unmount disposes registry -> tears down view and transport cleanly.
      unmount2()
      ctx.dispose()
      await flushMicrotasks(20)

      assert.equal(ctx.fakeEditors.handles[1]!.isDestroyed(), true)
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.isConnected),
        false,
      )
    } finally {
      ctx.dispose()
    }
  })

  test("editor docChanged and focus wake idle, docChanged updates 256 KiB retryability, and online retries errors", async () => {
    const ctx = await setupEditorTest({ autoHandshake: true })
    try {
      const unmountEditor = ctx.registry.mount(ctx.session.editorAtom)
      ctx.registry.set(ctx.session.elementAtom, Option.some(ctx.fakeElement))
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      const editor = ctx.fakeEditors.handles[0]!

      // 1. Idle eviction -> wake via editor focus
      await Effect.runPromise(ctx.fake.controller.close(4000, "idle"))
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "idle" })

      editor.emitFocus()
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      // 2. Idle eviction -> wake via editor docChanged
      await Effect.runPromise(ctx.fake.controller.close(4000, "idle"))
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "idle" })

      editor.emitDocChange(`${DEFAULT_SCRATCHPAD_SNIPPET}\n// edit`)
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      // 3. Oversized doc (> 256 KiB) + close 1009 -> non-retryable until trimmed
      editor.emitDocChange("x".repeat(MAX_DOC_BYTES + 64))
      await flushMicrotasks(20)
      await Effect.runPromise(
        ctx.fake.controller.close(1009, "Message too big"),
      )
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), {
        _tag: "error",
        code: "doc-too-large",
        message: "Message too big",
        retryable: false,
      })

      editor.emitDocChange("export const small = 1")
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), {
        _tag: "error",
        code: "doc-too-large",
        message: "Message too big",
        retryable: true,
      })

      // 4. Browser `online` event triggers automatic retry from retryable error
      ctx.onlineTarget.dispatchEvent(new Event("online"))
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      unmountEditor()
    } finally {
      ctx.dispose()
    }
  })
})
