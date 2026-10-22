import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { EnterpriseContent } from "../../../src/features/enterprise/content.ts"
import { EnterpriseContentError } from "../../../src/features/enterprise/domain.ts"
import {
  CONTACT_MEMBERS,
  Enterprise,
} from "../../../src/features/enterprise/service.ts"

const weeks = [
  { weekStart: "2024-04-15", downloads: 245_399 },
  { weekStart: "2026-09-28", downloads: 51_260_000 },
]

const content = (overrides: Partial<EnterpriseContent["Service"]> = {}) =>
  Layer.succeed(EnterpriseContent, {
    author: (id) =>
      Effect.succeed({
        name: `Name ${id}`,
        title: "Engineer",
        timezone: "Europe/Rome",
      }),
    avatar: (id) => Effect.succeed(`/avatars/${id}.webp`),
    effectVersion: Effect.succeed("4.0.1"),
    weeklyDownloads: Effect.succeed(weeks),
    ...overrides,
  })

const page = (layer: Layer.Layer<EnterpriseContent>) =>
  Effect.gen(function* () {
    const enterprise = yield* Enterprise
    return yield* enterprise.page
  }).pipe(Effect.provide(Enterprise.layer.pipe(Layer.provide(layer))))

test("builds the page from content", async () => {
  const result = await Effect.runPromise(page(content()))
  assert.equal(result.currentVersion, "4.0.1")
  assert.deepEqual(
    result.members.map((member) => member.id),
    CONTACT_MEMBERS.map((member) => member.id),
  )
  assert.equal(result.members[0]?.avatar, "/avatars/michael_arnaldi.webp")
  assert.equal(result.downloads.growth.value, "209×")
})

test("members link to their Google Calendar booking page", async () => {
  const result = await Effect.runPromise(page(content()))
  for (const [index, member] of result.members.entries()) {
    assert.equal(
      member.scheduleUrl,
      `https://calendar.google.com/calendar/appointments/schedules/${CONTACT_MEMBERS[index]!.scheduleId}?gv=true`,
    )
  }
})

test("a member without a timezone fails the page", async () => {
  const error = await Effect.runPromise(
    page(
      content({
        author: () =>
          Effect.succeed({ name: "A", title: "B", timezone: undefined }),
      }),
    ).pipe(Effect.flip),
  )
  assert.equal(error._tag, "EnterpriseContentError")
  assert.include(error.message, "timezone")
})

test("a missing avatar fails the page", async () => {
  const error = await Effect.runPromise(
    page(
      content({
        avatar: (id) =>
          Effect.fail(
            new EnterpriseContentError({ message: `No avatar for "${id}"` }),
          ),
      }),
    ).pipe(Effect.flip),
  )
  assert.include(error.message, "No avatar")
})

test("no downloads fails the page instead of charting nothing", async () => {
  const error = await Effect.runPromise(
    page(content({ weeklyDownloads: Effect.succeed([]) })).pipe(Effect.flip),
  )
  assert.equal(error._tag, "EnterpriseContentError")
})
