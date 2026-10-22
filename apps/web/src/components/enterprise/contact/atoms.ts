import * as Atom from "effect/reactivity/Atom"

export interface ContactMember {
  readonly id: string
  readonly name: string
  readonly title: string
  readonly avatar: string
  readonly timezone: string
  readonly scheduleUrl: string
}

/** Member whose booking dialog is open. Shared by every menu island and the dialog island. */
export const activeContactAtom = Atom.make<ContactMember | null>(null).pipe(
  Atom.keepAlive,
)
