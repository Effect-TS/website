import { getImage } from "astro:assets"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { EnterpriseContentError } from "./domain"

const images = import.meta.glob<{ default: ImageMetadata }>(
  "../../assets/authors/*.png",
  { eager: true },
)

/** Optimized avatars of the blog authors. */
export class Avatars extends Context.Service<
  Avatars,
  {
    /** URL of the avatar of a blog author. */
    readonly url: (
      authorId: string,
    ) => Effect.Effect<string, EnterpriseContentError>
  }
>()("app/Avatars") {
  static readonly layer = Layer.succeed(this, {
    url: Effect.fn("Avatars.url")(function* (authorId: string) {
      const image = images[`../../assets/authors/${authorId}.png`]?.default
      if (image === undefined) {
        return yield* new EnterpriseContentError({
          message: `No avatar for blog author "${authorId}"`,
        })
      }
      const optimized = yield* Effect.tryPromise({
        try: () =>
          getImage({ src: image, width: 96, height: 96, format: "webp" }),
        catch: (cause) =>
          new EnterpriseContentError({
            message: `Unable to optimize the avatar of "${authorId}"`,
            cause,
          }),
      })
      return optimized.src
    }),
  })
}
