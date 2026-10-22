import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Avatars } from "../../../src/features/enterprise/avatars.ts"
import { EnterpriseContentError } from "../../../src/features/enterprise/domain.ts"
import {
  CONTACT_MEMBERS,
  Enterprise,
} from "../../../src/features/enterprise/service.ts"
import { AstroContent } from "../../../src/lib/astro-content.ts"

interface Entry {
  readonly id: string
  readonly data: unknown
}

type Fixtures = Partial<Record<string, ReadonlyArray<Entry>>>

const author = (id: string, timezone: string | null = "Europe/Rome") => ({
  id,
  data: {
    name: `Name ${id}`,
    title: "Engineer",
    url: "https://example.com",
    timezone: timezone ?? undefined,
  },
})

const apiReference = (
  version: string,
  packageName: string,
  packageVersion: string,
) => ({
  id: `${version}/${packageName}`,
  data: { version, packageName, packageVersion },
})

const week = (weekStart: string, downloads: number) => ({
  id: weekStart,
  data: { packageName: "effect", weekStart, downloads },
})

const fixtures = (): Fixtures => ({
  blogAuthors: CONTACT_MEMBERS.map(({ id }) => author(id)),
  apiReference: [
    apiReference("v3", "effect", "3.19.0"),
    apiReference("v4", "effect", "4.0.1"),
    apiReference("v4", "@effect/platform-node", "4.0.1"),
  ],
  npmDownloads: [week("2026-09-28", 51_260_000), week("2024-04-15", 245_399)],
})

const content = (data: Fixtures) =>
  Layer.succeed(AstroContent, {
    collection: ((name: string, filter?: (entry: Entry) => boolean) =>
      Effect.succeed(
        (data[name] ?? []).filter(filter ?? (() => true)),
      )) as never,
  })

const avatars = Layer.succeed(Avatars, {
  url: (id) => Effect.succeed(`/avatars/${id}.webp`),
})

const page = (data: Fixtures, avatarLayer: Layer.Layer<Avatars> = avatars) =>
  Effect.gen(function* () {
    const enterprise = yield* Enterprise
    return yield* enterprise.page
  }).pipe(
    Effect.provide(
      Enterprise.layer.pipe(
        Layer.provide(Layer.mergeAll(content(data), avatarLayer)),
      ),
    ),
  )

test("builds the page from content collections", async () => {
  const result = await Effect.runPromise(page(fixtures()))
  assert.equal(result.currentVersion, "4.0.1")
  assert.deepEqual(
    result.members.map((member) => member.id),
    CONTACT_MEMBERS.map((member) => member.id),
  )
  assert.equal(result.members[0]?.avatar, "/avatars/michael_arnaldi.webp")
  assert.equal(result.members[0]?.name, "Name michael_arnaldi")
  assert.equal(result.downloads.growth.value, "209×")
})

test("only the v4 effect entry decides the current version", async () => {
  const result = await Effect.runPromise(
    page({
      ...fixtures(),
      apiReference: [apiReference("v3", "effect", "3.19.0")],
    }).pipe(Effect.flip),
  )
  assert.include(result.message, "no v4 effect entry")
})

test("members link to their Google Calendar booking page", async () => {
  const result = await Effect.runPromise(page(fixtures()))
  for (const [index, member] of result.members.entries()) {
    assert.equal(
      member.scheduleUrl,
      `https://calendar.google.com/calendar/appointments/schedules/${CONTACT_MEMBERS[index]!.scheduleId}?gv=true`,
    )
  }
})

test("a member that is not a blog author fails the page", async () => {
  const error = await Effect.runPromise(
    page({ ...fixtures(), blogAuthors: [] }).pipe(Effect.flip),
  )
  assert.include(error.message, "Unknown blog author")
})

test("a member without a timezone fails the page", async () => {
  const error = await Effect.runPromise(
    page({
      ...fixtures(),
      blogAuthors: CONTACT_MEMBERS.map(({ id }) => author(id, null)),
    }).pipe(Effect.flip),
  )
  assert.include(error.message, "timezone")
})

test("a missing avatar fails the page", async () => {
  const error = await Effect.runPromise(
    page(
      fixtures(),
      Layer.succeed(Avatars, {
        url: (id) =>
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
    page({ ...fixtures(), npmDownloads: [] }).pipe(Effect.flip),
  )
  assert.equal(error._tag, "EnterpriseContentError")
})
