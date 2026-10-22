import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { downloadsChart } from "@/features/npm-downloads/chart"
import { EnterpriseContent } from "./content"
import { EnterpriseContentError, type ContactMember } from "./domain"
import { CONTACT_MEMBERS, scheduleUrl } from "./members"

export class Enterprise extends Context.Service<Enterprise>()(
  "app/Enterprise",
  {
    make: Effect.gen(function* () {
      const content = yield* EnterpriseContent

      const members = Effect.forEach(
        CONTACT_MEMBERS,
        Effect.fn("Enterprise.member")(function* ({ id, scheduleId }) {
          const author = yield* content.author(id)
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
            avatar: yield* content.avatar(id),
            scheduleUrl: scheduleUrl(scheduleId),
          } satisfies ContactMember
        }),
        { concurrency: "unbounded" },
      )

      const downloads = content.weeklyDownloads.pipe(
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
        { members, currentVersion: content.effectVersion, downloads },
        { concurrency: "unbounded" },
      ).pipe(Effect.withSpan("Enterprise.page"))

      return { page } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
