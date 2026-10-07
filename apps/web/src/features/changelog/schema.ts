import { ChangelogPackage } from "@website/domain/Changelog"
import { z } from "astro/zod"
import * as Schema from "effect/Schema"

export const ChangelogContentEntry = z.custom<typeof ChangelogPackage.Type>(
  Schema.is(ChangelogPackage),
)
