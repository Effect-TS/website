import { getImage } from "astro:assets"
import { getCollection } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { EnterpriseContent } from "./content"
import { EnterpriseContentError } from "./domain"

const avatars = import.meta.glob<{ default: ImageMetadata }>(
  "../../assets/authors/*.png",
  {
    eager: true,
  },
)

const attempt = <A>(message: string, evaluate: () => Promise<A>) =>
  Effect.tryPromise({
    try: evaluate,
    catch: (cause) => new EnterpriseContentError({ message, cause }),
  })

export const layer = Layer.succeed(EnterpriseContent, {
  author: Effect.fn("EnterpriseContent.author")(function* (id: string) {
    const authors = yield* attempt("Unable to read blog authors", () =>
      getCollection("blogAuthors"),
    )
    const author = authors.find((entry) => entry.id === id)
    if (author === undefined) {
      return yield* new EnterpriseContentError({
        message: `Unknown blog author "${id}"`,
      })
    }
    return {
      name: author.data.name,
      title: author.data.title,
      timezone: author.data.timezone,
    }
  }),

  avatar: Effect.fn("EnterpriseContent.avatar")(function* (id: string) {
    const avatar = avatars[`../../assets/authors/${id}.png`]?.default
    if (avatar === undefined) {
      return yield* new EnterpriseContentError({
        message: `No avatar for blog author "${id}"`,
      })
    }
    const image = yield* attempt(
      `Unable to optimize the avatar of "${id}"`,
      () => getImage({ src: avatar, width: 96, height: 96, format: "webp" }),
    )
    return image.src
  }),

  effectVersion: Effect.gen(function* () {
    const [entry] = yield* attempt("Unable to read the API reference", () =>
      getCollection(
        "apiReference",
        ({ data }) => data.version === "v4" && data.packageName === "effect",
      ),
    )
    if (entry === undefined) {
      return yield* new EnterpriseContentError({
        message: "The API reference has no v4 effect entry",
      })
    }
    return entry.data.packageVersion
  }).pipe(Effect.withSpan("EnterpriseContent.effectVersion")),

  weeklyDownloads: attempt("Unable to read npm downloads", () =>
    getCollection("npmDownloads"),
  ).pipe(
    Effect.map((entries) =>
      entries
        .map(({ data }) => ({
          weekStart: data.weekStart,
          downloads: data.downloads,
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    ),
    Effect.withSpan("EnterpriseContent.weeklyDownloads"),
  ),
})
