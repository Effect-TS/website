import * as Clipboard from "@effect/platform-browser/Clipboard"
import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { makeCopyAtom } from "../../../src/features/enterprise/atoms.ts"

const fakeClipboard = (written: Array<string>) =>
  Layer.succeed(
    Clipboard.Clipboard,
    Clipboard.make({
      read: Effect.succeed([]),
      readString: Effect.succeed(""),
      write: () => Effect.void,
      writeString: (text) => Effect.sync(() => void written.push(text)),
    }),
  )

const settled = (
  registry: AtomRegistry.AtomRegistry,
  atom: ReturnType<typeof makeCopyAtom>,
  until: (result: AsyncResult.AsyncResult<unknown, unknown>) => boolean,
) =>
  new Promise<void>((resolve) => {
    if (until(registry.get(atom))) return resolve()
    const stop = registry.subscribe(atom, (result) => {
      if (until(result)) {
        stop()
        resolve()
      }
    })
  })

test("copies the text, shows success, then resets", async () => {
  const written: Array<string> = []
  const atom = makeCopyAtom(fakeClipboard(written), "10 millis")
  const registry = AtomRegistry.make()
  registry.mount(atom)

  registry.set(atom, "# Proposal")
  await settled(registry, atom, AsyncResult.isSuccess)
  assert.deepEqual(written, ["# Proposal"])

  await settled(registry, atom, AsyncResult.isInitial)
})
