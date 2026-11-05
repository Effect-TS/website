import * as Clipboard from "@effect/platform-browser/Clipboard"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import type { ContactMember } from "./domain"

/** Member whose booking dialog is open. Shared by every menu island and the dialog island. */
export const activeContactAtom = Atom.make<ContactMember | null>(null).pipe(
  Atom.keepAlive,
)

/** Copies text. Succeeds for a moment, then goes back to its initial state. */
export const makeCopyAtom = (
  clipboard: Layer.Layer<Clipboard.Clipboard>,
  copiedFor: Duration.Input = "1500 millis",
) =>
  Atom.runtime(clipboard).fn<string>()(
    Effect.fnUntraced(function* (text, get) {
      const target = yield* Clipboard.Clipboard
      yield* target.writeString(text)
      yield* Effect.sleep(copiedFor).pipe(
        Effect.tap(() => Effect.sync(() => get.setSelf(AsyncResult.initial()))),
        Effect.forkScoped,
      )
    }),
  )

export const copyTemplateAtom = makeCopyAtom(Clipboard.layer)
