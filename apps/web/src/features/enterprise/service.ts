import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { downloadsChart } from "@/features/npm-downloads/chart"
import { AstroContent } from "@/lib/astro-content"
import { Avatars } from "./avatars"
import { EnterpriseContentError, type ContactMember } from "./domain"

/** Team members offered in the "Talk to the Effect team" menu, in order. */
export const CONTACT_MEMBERS: ReadonlyArray<{
  /** Blog author id. Name, title, timezone and avatar come from the author. */
  readonly id: string
  /** Google Calendar appointment schedule id of the member's booking page. */
  readonly scheduleId: string
}> = [
  { id: "michael_arnaldi", scheduleId: "TODO" },
  { id: "maxwell_brown", scheduleId: "TODO" },
  { id: "sebastian_lorenz", scheduleId: "TODO" },
  { id: "tim_smart", scheduleId: "TODO" },
]

export const scheduleUrl = (scheduleId: string) =>
  `https://calendar.google.com/calendar/appointments/schedules/${scheduleId}?gv=true`

export class Enterprise extends Context.Service<Enterprise>()(
  "app/Enterprise",
  {
    make: Effect.gen(function* () {
      const content = yield* AstroContent
      const avatars = yield* Avatars

      const members = Effect.gen(function* () {
        const authors = yield* content.collection("blogAuthors")
        return yield* Effect.forEach(
          CONTACT_MEMBERS,
          Effect.fn("Enterprise.member")(function* ({ id, scheduleId }) {
            const author = authors.find((entry) => entry.id === id)?.data
            if (author === undefined) {
              return yield* new EnterpriseContentError({
                message: `Unknown blog author "${id}"`,
              })
            }
            if (author.timezone === undefined) {
              return yield* new EnterpriseContentError({
                message: `Contact member "${id}" has no timezone`,
              })
            }
            return {
              id,
              name: author.name,
              title: author.title,
              timezone: author.timezone,
              avatar: yield* avatars.url(id),
              scheduleUrl: scheduleUrl(scheduleId),
            } satisfies ContactMember
          }),
          { concurrency: "unbounded" },
        )
      })

      const currentVersion = Effect.gen(function* () {
        const [entry] = yield* content.collection(
          "apiReference",
          ({ data }) => data.version === "v4" && data.packageName === "effect",
        )
        if (entry === undefined) {
          return yield* new EnterpriseContentError({
            message: "The API reference has no v4 effect entry",
          })
        }
        return entry.data.packageVersion
      })

      const downloads = content.collection("npmDownloads").pipe(
        Effect.map((entries) =>
          entries
            .map(({ data }) => ({
              weekStart: data.weekStart,
              downloads: data.downloads,
            }))
            .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
        ),
        Effect.flatMap((weeks) =>
          Effect.try({
            try: () => downloadsChart(weeks),
            catch: (cause) =>
              new EnterpriseContentError({
                message: "No npm downloads to chart",
                cause,
              }),
          }),
        ),
      )

      const page = Effect.all(
        { members, currentVersion, downloads },
        { concurrency: "unbounded" },
      ).pipe(Effect.withSpan("Enterprise.page"))

      return { page } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
