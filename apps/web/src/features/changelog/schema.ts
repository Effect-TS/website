import { ChangelogEntry } from "@website/domain/ChangelogView"
import { z } from "astro/zod"
import * as Schema from "effect/Schema"

export const ChangelogContentEntry = z.custom<typeof ChangelogEntry.Type>(
  Schema.is(ChangelogEntry),
)
