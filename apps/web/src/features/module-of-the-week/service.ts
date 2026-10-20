import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Order from "effect/Order"
import { ModuleContent } from "./content"
import { ModuleNotFound, type Module, type ModulePost } from "./domain"

const byDate = Order.mapInput(Order.Date, (post: ModulePost) => post.data.date)

const withoutPrefix = (title: string) =>
  title.replace(/^Module of the Week\s*-\s*/, "")

export class Modules extends Context.Service<Modules>()("website/Modules", {
  make: Effect.gen(function* () {
    const content = yield* ModuleContent

    /** Publication order, numbered from 1. */
    const modules = content.posts.pipe(
      Effect.map((posts) =>
        pipe(
          posts,
          Array.sort(byDate),
          Array.map((post, index): Module => ({
            post,
            number: index + 1,
            title: withoutPrefix(post.data.title),
          })),
        ),
      ),
    )

    const latest = Effect.map(modules, Array.reverse)

    /** Looks a module up by its number or its post id. */
    const module = Effect.fn("Modules.module")(function* (
      ref: number | string,
    ) {
      const all = yield* modules
      const match = all.find(
        (candidate) => candidate.number === ref || candidate.post.id === ref,
      )
      return match ?? (yield* new ModuleNotFound({ ref }))
    })

    return { modules, latest, intro: content.intro, module } as const
  }),
}) {
  static layer = Layer.effect(this, this.make)
}
